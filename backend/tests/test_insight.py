"""Cash Claw Claude Sonnet 4.5 insight endpoint tests."""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL", "https://agent-learning-money.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="module")
def deployment(s):
    """Ensure at least one deployed agent and return its deployment dict."""
    agents = s.get(f"{API}/agents").json()
    # try existing deployment first
    my = s.get(f"{API}/my-agents").json()
    if my:
        return my[0]
    # otherwise deploy
    r = s.post(f"{API}/deploy", json={"agent_id": agents[0]["id"]})
    assert r.status_code == 200
    dep = r.json()
    # convert to my-agents shape
    return {**dep, "agent": agents[0]}


class TestInsight:
    def test_insight_first_call_uncached(self, s, deployment, db):
        dep_id = deployment["id"]
        # clear any existing cached insight for clean first-call assertion
        db.insights.delete_many({"deployment_id": dep_id})

        r = s.get(f"{API}/insight/{dep_id}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["deployment_id"] == dep_id
        assert "level" in body and isinstance(body["level"], int)
        assert "narrative" in body
        assert "generated_at" in body
        assert body.get("cached") is False
        # narrative may be empty if EMERGENT_LLM_KEY missing — flag clearly
        assert body["narrative"], f"expected non-empty narrative; got error={body.get('error')}"
        assert isinstance(body["narrative"], str)
        assert len(body["narrative"]) <= 400, f"narrative too long: {len(body['narrative'])}"

    def test_insight_second_call_cached_same_narrative(self, s, deployment):
        dep_id = deployment["id"]
        r1 = s.get(f"{API}/insight/{dep_id}")
        assert r1.status_code == 200
        n1 = r1.json()
        r2 = s.get(f"{API}/insight/{dep_id}")
        assert r2.status_code == 200
        n2 = r2.json()
        assert n2["cached"] is True
        assert n2["narrative"] == n1["narrative"]
        assert n2["level"] == n1["level"]

    def test_insight_404_bad_id(self, s):
        r = s.get(f"{API}/insight/nope_xxxxxxx")
        assert r.status_code == 404

    def test_insights_one_doc_per_level(self, s, deployment, db):
        dep_id = deployment["id"]
        # Multiple calls
        for _ in range(3):
            s.get(f"{API}/insight/{dep_id}")
        # tick to current level
        dep = db.deployed_agents.find_one({"id": dep_id})
        level = dep["level"] if dep else None
        assert level is not None
        count = db.insights.count_documents({"deployment_id": dep_id, "level": level})
        assert count == 1, f"expected exactly 1 insight doc per (deployment,level); got {count}"

    def test_insight_regenerates_on_level_up(self, s, deployment, db):
        dep_id = deployment["id"]
        # First call to ensure cached entry at current level
        r1 = s.get(f"{API}/insight/{dep_id}").json()
        old_level = r1["level"]
        old_narrative = r1["narrative"]

        # Force level-up by bumping xp in DB directly
        dep = db.deployed_agents.find_one({"id": dep_id})
        new_xp = ((old_level) * 500) + 50  # ensures level = old_level + 1
        db.deployed_agents.update_one(
            {"id": dep_id},
            {"$set": {"xp": new_xp, "level": old_level + 1}},
        )

        r2 = s.get(f"{API}/insight/{dep_id}")
        assert r2.status_code == 200
        body = r2.json()
        assert body["level"] >= old_level + 1, f"level should have advanced: {body}"
        assert body["cached"] is False
        assert body["narrative"]
        assert body["narrative"] != old_narrative or body["level"] != old_level
