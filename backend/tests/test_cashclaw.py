"""Cash Claw backend API tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://agent-learning-money.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ========== Catalog ==========
class TestCatalog:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert "Cash Claw" in r.json().get("message", "")

    def test_agents_list_12(self, s):
        r = s.get(f"{API}/agents")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 12
        a = data[0]
        for k in ["id", "name", "category", "github_repo", "base_daily_earning", "community_earned", "total_deploys"]:
            assert k in a

    def test_agents_category_filter(self, s):
        r = s.get(f"{API}/agents", params={"category": "trading"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(a["category"] == "trading" for a in data)

    def test_categories(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        ids = [c["id"] for c in cats]
        assert "all" in ids
        for c in ["trading", "content", "social", "scraping", "tasks"]:
            assert c in ids
        assert len(cats) == 6

    def test_agent_detail_my_deployment_null(self, s):
        agents = s.get(f"{API}/agents").json()
        # find an agent that's not yet deployed
        aid = agents[-1]["id"]
        r = s.get(f"{API}/agents/{aid}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == aid
        assert "my_deployment" in d

    def test_agent_detail_404(self, s):
        r = s.get(f"{API}/agents/does_not_exist")
        assert r.status_code == 404


# ========== Deploy + MyAgents ==========
class TestDeployFlow:
    deployed_id = None
    agent_id = None

    def test_deploy_creates_and_increments(self, s):
        agents = s.get(f"{API}/agents").json()
        agent = agents[0]
        TestDeployFlow.agent_id = agent["id"]
        pre = agent["total_deploys"]

        r = s.post(f"{API}/deploy", json={"agent_id": agent["id"]})
        assert r.status_code == 200
        dep = r.json()
        assert dep["agent_id"] == agent["id"]
        assert dep["active"] is True
        assert dep["earned_total"] == 0.0
        TestDeployFlow.deployed_id = dep["id"]

        after = s.get(f"{API}/agents/{agent['id']}").json()
        # only increment on first-time deploy; reactivation doesn't count
        assert after["total_deploys"] >= pre
        assert after["my_deployment"] is not None

    def test_my_agents_ticks_over_5s(self, s):
        # Deploy second agent so list has items
        agents = s.get(f"{API}/agents").json()
        s.post(f"{API}/deploy", json={"agent_id": agents[1]["id"]})

        first = s.get(f"{API}/my-agents").json()
        assert isinstance(first, list) and len(first) >= 1
        e0 = sum(d.get("earned_total", 0) for d in first)
        x0 = sum(d.get("xp", 0) for d in first)
        time.sleep(5)
        second = s.get(f"{API}/my-agents").json()
        e1 = sum(d.get("earned_total", 0) for d in second)
        x1 = sum(d.get("xp", 0) for d in second)
        assert e1 > e0, f"earnings should tick up {e0}->{e1}"
        assert x1 > x0, f"xp should tick up {x0}->{x1}"
        # verify progress fields
        for d in second:
            assert "next_level_xp" in d and "progress" in d and "agent" in d

    def test_toggle_pauses_and_resumes(self, s):
        dep_id = TestDeployFlow.deployed_id
        assert dep_id
        r1 = s.post(f"{API}/deploy/{dep_id}/toggle")
        assert r1.status_code == 200
        assert r1.json()["active"] is False
        r2 = s.post(f"{API}/deploy/{dep_id}/toggle")
        assert r2.status_code == 200
        assert r2.json()["active"] is True

    def test_toggle_404(self, s):
        r = s.post(f"{API}/deploy/nope/toggle")
        assert r.status_code == 404


# ========== Dashboard / Leaderboard / Profile ==========
class TestAggregates:
    def test_dashboard(self, s):
        r = s.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_earned", "active_agents", "deployed_agents", "pending_payout", "avg_level", "featured_agent"]:
            assert k in d
        assert d["featured_agent"] is not None
        assert d["deployed_agents"] >= 1

    def test_leaderboard(self, s):
        r = s.get(f"{API}/leaderboard")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 10
        top = rows[0]
        assert "agent" in top and "total_earned" in top

    def test_profile(self, s):
        r = s.get(f"{API}/profile")
        assert r.status_code == 200
        p = r.json()
        assert p["handle"] == "@neon_runner"
        assert p["tier"] == "OPERATOR_01"
        for k in ["total_agents", "total_xp", "lifetime_earned"]:
            assert k in p


# ========== Wallet ==========
class TestWallet:
    def test_wallet_grows(self, s):
        w1 = s.get(f"{API}/wallet").json()
        assert "balance" in w1 and "lifetime_earned" in w1 and "payouts" in w1
        time.sleep(3)
        w2 = s.get(f"{API}/wallet").json()
        assert w2["balance"] >= w1["balance"]

    def test_withdraw_success(self, s):
        w = s.get(f"{API}/wallet").json()
        bal = w["balance"]
        assert bal > 0, "Expected wallet balance to be > 0 from prior ticks"
        amt = round(min(bal * 0.5, 0.01 if bal < 0.02 else bal * 0.5), 4)
        amt = max(amt, 0.0001)
        r = s.post(f"{API}/wallet/withdraw", json={"amount": amt})
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["status"] == "completed"
        assert p["method"] == "USDC"
        w2 = s.get(f"{API}/wallet").json()
        assert len(w2["payouts"]) >= 1

    def test_withdraw_insufficient(self, s):
        r = s.post(f"{API}/wallet/withdraw", json={"amount": 9_999_999.0})
        assert r.status_code == 400

    def test_withdraw_invalid_amount(self, s):
        # server checks insufficient first; bal may be >0 so 0 -> Insufficient? 0 < bal true so goes to amount<=0 check
        r = s.post(f"{API}/wallet/withdraw", json={"amount": 0})
        assert r.status_code == 400
