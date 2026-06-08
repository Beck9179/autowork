from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Cash Claw API")
api_router = APIRouter(prefix="/api")

# Single demo user for v1 (no auth)
DEMO_USER_ID = "user_demo"


# ================== MODELS ==================
class Agent(BaseModel):
    id: str
    name: str
    creator: str
    github_repo: str
    category: str  # trading | content | tasks | scraping | social
    description: str
    tagline: str
    icon: str  # ionicon name
    accent_color: str  # hex
    base_daily_earning: float  # USD per day baseline
    volatility: float  # 0-1 randomness
    required_xp_per_level: int
    total_deploys: int
    community_earned: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DeployedAgent(BaseModel):
    id: str
    user_id: str
    agent_id: str
    deployed_at: datetime
    last_tick_at: datetime
    active: bool
    earned_total: float
    xp: int
    level: int


class DeployRequest(BaseModel):
    agent_id: str


class WithdrawRequest(BaseModel):
    amount: float


class Payout(BaseModel):
    id: str
    user_id: str
    amount: float
    status: str  # pending | completed
    method: str
    created_at: datetime


# ================== SEED DATA ==================
SEED_AGENTS = [
    {
        "name": "QuantumScalper",
        "creator": "defi-labs",
        "github_repo": "defi-labs/quantum-scalper",
        "category": "trading",
        "description": "High-frequency arbitrage scalper that routes micro-trades across DEXs. Evolves its signal model every 500 trades.",
        "tagline": "Scalps micro-spreads across 14 DEXs",
        "icon": "pulse-outline",
        "accent_color": "#39FF14",
        "base_daily_earning": 24.50,
        "volatility": 0.4,
    },
    {
        "name": "GhostWriter.ai",
        "creator": "neural-forge",
        "github_repo": "neural-forge/ghostwriter-ai",
        "category": "content",
        "description": "Generates SEO-optimized long-form articles and sells them on content marketplaces. Learns from top-converting pieces.",
        "tagline": "Sells SEO articles autonomously",
        "icon": "create-outline",
        "accent_color": "#FF00FF",
        "base_daily_earning": 12.80,
        "volatility": 0.25,
    },
    {
        "name": "ReelRider",
        "creator": "viral-ops",
        "github_repo": "viral-ops/reel-rider",
        "category": "social",
        "description": "Clips, captions, and publishes short-form videos across TikTok/Reels/Shorts. Monetizes via creator funds and affiliate drops.",
        "tagline": "Viral short-form video factory",
        "icon": "videocam-outline",
        "accent_color": "#00FFFF",
        "base_daily_earning": 8.90,
        "volatility": 0.5,
    },
    {
        "name": "OrderFlow Sentinel",
        "creator": "quant-dao",
        "github_repo": "quant-dao/orderflow-sentinel",
        "category": "trading",
        "description": "Reads order-book imbalance and reacts in milliseconds. Evolves parameters per-symbol through reinforcement learning.",
        "tagline": "Order-book imbalance hunter",
        "icon": "trending-up-outline",
        "accent_color": "#39FF14",
        "base_daily_earning": 31.20,
        "volatility": 0.6,
    },
    {
        "name": "PromptPirate",
        "creator": "gen-stack",
        "github_repo": "gen-stack/prompt-pirate",
        "category": "content",
        "description": "Auto-generates and lists AI prompt packs on PromptBase and Gumroad. Learns which niches convert.",
        "tagline": "Sells prompt packs on autopilot",
        "icon": "terminal-outline",
        "accent_color": "#FF00FF",
        "base_daily_earning": 6.40,
        "volatility": 0.2,
    },
    {
        "name": "DataHarvester",
        "creator": "scrape-collective",
        "github_repo": "scrape-collective/data-harvester",
        "category": "scraping",
        "description": "Scrapes structured datasets (e-comm prices, job boards) and sells subscription feeds to analytics firms.",
        "tagline": "Sells scraped datasets as subscriptions",
        "icon": "server-outline",
        "accent_color": "#00FFFF",
        "base_daily_earning": 18.70,
        "volatility": 0.3,
    },
    {
        "name": "TaskRabbit Neural",
        "creator": "agent-works",
        "github_repo": "agent-works/taskrabbit-neural",
        "category": "tasks",
        "description": "Bids on micro-tasks on Fiverr/Upwork using a learned pricing model. Delivers AI-assisted output.",
        "tagline": "Micro-task bidder & executor",
        "icon": "briefcase-outline",
        "accent_color": "#39FF14",
        "base_daily_earning": 15.30,
        "volatility": 0.35,
    },
    {
        "name": "MemeMiner",
        "creator": "dank-labs",
        "github_repo": "dank-labs/meme-miner",
        "category": "social",
        "description": "Spots trending meme formats early and posts affiliate-tagged merch drops. Evolves meme-selection weights daily.",
        "tagline": "Trend-jacks memes into affiliate sales",
        "icon": "flame-outline",
        "accent_color": "#FF00FF",
        "base_daily_earning": 4.90,
        "volatility": 0.7,
    },
    {
        "name": "StaticArb",
        "creator": "bridge-ops",
        "github_repo": "bridge-ops/static-arb",
        "category": "trading",
        "description": "Cross-chain stablecoin arbitrage with gas-aware routing. Retrains spread predictor nightly.",
        "tagline": "Cross-chain stablecoin arbitrage",
        "icon": "swap-horizontal-outline",
        "accent_color": "#39FF14",
        "base_daily_earning": 22.10,
        "volatility": 0.25,
    },
    {
        "name": "AutoNewsletter",
        "creator": "substack-scripts",
        "github_repo": "substack-scripts/auto-newsletter",
        "category": "content",
        "description": "Writes & publishes a niche paid newsletter. Learns subscriber churn signals to refine topics.",
        "tagline": "Runs a paid newsletter autonomously",
        "icon": "mail-outline",
        "accent_color": "#FF00FF",
        "base_daily_earning": 9.60,
        "volatility": 0.15,
    },
    {
        "name": "ShopifyScout",
        "creator": "ecom-forge",
        "github_repo": "ecom-forge/shopify-scout",
        "category": "scraping",
        "description": "Discovers winning Shopify products before they trend, then flips affiliate or dropship campaigns.",
        "tagline": "Finds winning products before they trend",
        "icon": "cart-outline",
        "accent_color": "#00FFFF",
        "base_daily_earning": 13.40,
        "volatility": 0.4,
    },
    {
        "name": "BugBountyBot",
        "creator": "sec-ronin",
        "github_repo": "sec-ronin/bugbounty-bot",
        "category": "tasks",
        "description": "Scans public bug-bounty targets for known CVE patterns and files responsible disclosures for payouts.",
        "tagline": "Automated bug-bounty hunter",
        "icon": "bug-outline",
        "accent_color": "#39FF14",
        "base_daily_earning": 19.80,
        "volatility": 0.55,
    },
]


async def seed_if_empty():
    count = await db.agents.count_documents({})
    if count > 0:
        return
    now = datetime.now(timezone.utc)
    docs = []
    for a in SEED_AGENTS:
        docs.append({
            "id": f"agent_{uuid.uuid4().hex[:10]}",
            **a,
            "required_xp_per_level": 500,
            "total_deploys": random.randint(120, 9800),
            "community_earned": round(random.uniform(8_000, 420_000), 2),
            "created_at": now,
        })
    await db.agents.insert_many(docs)

    # Seed wallet
    existing_wallet = await db.wallets.find_one({"user_id": DEMO_USER_ID}, {"_id": 0})
    if not existing_wallet:
        await db.wallets.insert_one({
            "user_id": DEMO_USER_ID,
            "balance": 0.0,
            "lifetime_earned": 0.0,
            "created_at": now,
        })


# ================== HELPERS ==================
def _strip(doc):
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


def _level_from_xp(xp: int, per_level: int = 500) -> int:
    return 1 + (xp // per_level)


async def _tick_deployed(deployed: dict, agent: dict) -> dict:
    """Advance earnings & XP based on elapsed time since last_tick_at."""
    if not deployed.get("active"):
        return deployed
    now = datetime.now(timezone.utc)
    last = deployed.get("last_tick_at")
    if isinstance(last, str):
        last = datetime.fromisoformat(last)
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    elapsed_sec = max(0, (now - last).total_seconds())
    if elapsed_sec < 1:
        return deployed

    base_per_sec = agent["base_daily_earning"] / 86400.0
    level_multiplier = 1.0 + 0.08 * (deployed.get("level", 1) - 1)
    vol = agent.get("volatility", 0.3)
    # noise factor 1 +- vol
    noise = 1.0 + random.uniform(-vol, vol)
    earned_delta = base_per_sec * elapsed_sec * level_multiplier * noise
    earned_delta = max(0.0, earned_delta)

    # XP: ~1 XP per 2 seconds for active agent plus variance
    xp_delta = int(elapsed_sec / 2) + random.randint(0, max(1, int(elapsed_sec / 3)))

    new_earned = round(deployed.get("earned_total", 0.0) + earned_delta, 4)
    new_xp = deployed.get("xp", 0) + xp_delta
    new_level = _level_from_xp(new_xp)

    await db.deployed_agents.update_one(
        {"id": deployed["id"]},
        {"$set": {
            "earned_total": new_earned,
            "xp": new_xp,
            "level": new_level,
            "last_tick_at": now,
        }}
    )
    # Update community_earned on agent & wallet balance
    await db.agents.update_one(
        {"id": agent["id"]},
        {"$inc": {"community_earned": round(earned_delta, 4)}}
    )
    await db.wallets.update_one(
        {"user_id": deployed["user_id"]},
        {"$inc": {"balance": round(earned_delta, 4), "lifetime_earned": round(earned_delta, 4)}}
    )

    deployed["earned_total"] = new_earned
    deployed["xp"] = new_xp
    deployed["level"] = new_level
    deployed["last_tick_at"] = now
    return deployed


# ================== ROUTES ==================
@api_router.get("/")
async def root():
    return {"message": "Cash Claw API online", "version": "1.0.0"}


@api_router.get("/agents")
async def list_agents(category: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    cursor = db.agents.find(query, {"_id": 0}).sort("community_earned", -1).limit(200)
    return await cursor.to_list(200)


@api_router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    doc = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Agent not found")
    # Attach user's deployment if exists
    dep = await db.deployed_agents.find_one(
        {"user_id": DEMO_USER_ID, "agent_id": agent_id}, {"_id": 0}
    )
    if dep:
        dep = await _tick_deployed(dep, doc)
    doc["my_deployment"] = _strip(dep)
    return doc


@api_router.post("/deploy")
async def deploy_agent(req: DeployRequest):
    agent = await db.agents.find_one({"id": req.agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(404, "Agent not found")
    existing = await db.deployed_agents.find_one(
        {"user_id": DEMO_USER_ID, "agent_id": req.agent_id}, {"_id": 0}
    )
    now = datetime.now(timezone.utc)
    if existing:
        # reactivate
        await db.deployed_agents.update_one(
            {"id": existing["id"]},
            {"$set": {"active": True, "last_tick_at": now}}
        )
        existing["active"] = True
        existing["last_tick_at"] = now
        return _strip(existing)

    dep = {
        "id": f"dep_{uuid.uuid4().hex[:10]}",
        "user_id": DEMO_USER_ID,
        "agent_id": req.agent_id,
        "deployed_at": now,
        "last_tick_at": now,
        "active": True,
        "earned_total": 0.0,
        "xp": 0,
        "level": 1,
    }
    await db.deployed_agents.insert_one(dep)
    await db.agents.update_one({"id": req.agent_id}, {"$inc": {"total_deploys": 1}})
    return _strip(dep)


@api_router.post("/deploy/{deployment_id}/toggle")
async def toggle_deployment(deployment_id: str):
    dep = await db.deployed_agents.find_one({"id": deployment_id}, {"_id": 0})
    if not dep:
        raise HTTPException(404, "Deployment not found")
    agent = await db.agents.find_one({"id": dep["agent_id"]}, {"_id": 0})
    if dep.get("active"):
        dep = await _tick_deployed(dep, agent)
        await db.deployed_agents.update_one(
            {"id": deployment_id}, {"$set": {"active": False}}
        )
        dep["active"] = False
    else:
        now = datetime.now(timezone.utc)
        await db.deployed_agents.update_one(
            {"id": deployment_id}, {"$set": {"active": True, "last_tick_at": now}}
        )
        dep["active"] = True
        dep["last_tick_at"] = now
    return _strip(dep)


@api_router.get("/my-agents")
async def my_agents():
    deps = await db.deployed_agents.find(
        {"user_id": DEMO_USER_ID}, {"_id": 0}
    ).limit(200).to_list(200)
    if not deps:
        return []
    agent_ids = [d["agent_id"] for d in deps]
    agents = await db.agents.find({"id": {"$in": agent_ids}}, {"_id": 0}).to_list(len(agent_ids))
    agents_map = {a["id"]: a for a in agents}
    result = []
    for dep in deps:
        agent = agents_map.get(dep["agent_id"])
        if not agent:
            continue
        dep = await _tick_deployed(dep, agent)
        result.append({
            **dep,
            "agent": agent,
            "next_level_xp": (dep["level"]) * 500,
            "progress": (dep["xp"] % 500) / 500.0,
        })
    result.sort(key=lambda x: x.get("earned_total", 0), reverse=True)
    return result


@api_router.get("/dashboard")
async def dashboard():
    deps = await db.deployed_agents.find(
        {"user_id": DEMO_USER_ID}, {"_id": 0}
    ).limit(200).to_list(200)

    agents_map: dict = {}
    if deps:
        agent_ids = [d["agent_id"] for d in deps]
        agents = await db.agents.find({"id": {"$in": agent_ids}}, {"_id": 0}).to_list(len(agent_ids))
        agents_map = {a["id"]: a for a in agents}

    total_earned = 0.0
    active_count = 0
    total_xp = 0
    total_level = 0
    for dep in deps:
        agent = agents_map.get(dep["agent_id"])
        if agent:
            dep = await _tick_deployed(dep, agent)
        total_earned += dep.get("earned_total", 0.0)
        total_xp += dep.get("xp", 0)
        total_level += dep.get("level", 1)
        if dep.get("active"):
            active_count += 1

    wallet = await db.wallets.find_one({"user_id": DEMO_USER_ID}, {"_id": 0}) or {}
    avg_evolution = (total_level / len(deps)) if deps else 0

    # Featured: top agent by community_earned the user hasn't deployed, else highest
    deployed_ids = list({d["agent_id"] for d in deps})
    featured = await db.agents.find_one(
        {"id": {"$nin": deployed_ids}}, {"_id": 0},
        sort=[("community_earned", -1)],
    )
    if featured is None:
        featured = await db.agents.find_one({}, {"_id": 0}, sort=[("community_earned", -1)])

    return {
        "total_earned": round(total_earned, 4),
        "active_agents": active_count,
        "deployed_agents": len(deps),
        "pending_payout": round(wallet.get("balance", 0.0), 4),
        "total_xp": total_xp,
        "avg_level": round(avg_evolution, 2),
        "featured_agent": featured,
    }


@api_router.get("/leaderboard")
async def leaderboard():
    # Aggregate top deployed_agents by earned_total (global)
    pipeline = [
        {"$group": {
            "_id": "$agent_id",
            "total_earned": {"$sum": "$earned_total"},
            "deploys": {"$sum": 1},
            "avg_level": {"$avg": "$level"},
        }},
        {"$sort": {"total_earned": -1}},
        {"$limit": 25},
    ]
    rows = await db.deployed_agents.aggregate(pipeline).to_list(25)
    # fallback: if sparse, show top agents by community_earned
    if len(rows) < 10:
        agents = await db.agents.find({}, {"_id": 0}).sort("community_earned", -1).to_list(25)
        return [{
            "agent": a,
            "total_earned": a["community_earned"],
            "deploys": a["total_deploys"],
            "avg_level": random.randint(3, 14),
        } for a in agents]

    result = []
    agent_ids = [r["_id"] for r in rows]
    agents = await db.agents.find({"id": {"$in": agent_ids}}, {"_id": 0}).to_list(len(agent_ids))
    agents_map = {a["id"]: a for a in agents}
    for r in rows:
        agent = agents_map.get(r["_id"])
        if not agent:
            continue
        result.append({
            "agent": agent,
            "total_earned": round(r["total_earned"], 2),
            "deploys": r["deploys"],
            "avg_level": round(r["avg_level"] or 1, 1),
        })
    return result


@api_router.get("/wallet")
async def get_wallet():
    # tick everything to make balance fresh
    deps = await db.deployed_agents.find({"user_id": DEMO_USER_ID}, {"_id": 0}).limit(200).to_list(200)
    for dep in deps:
        agent = await db.agents.find_one({"id": dep["agent_id"]}, {"_id": 0})
        if agent:
            await _tick_deployed(dep, agent)

    wallet = await db.wallets.find_one({"user_id": DEMO_USER_ID}, {"_id": 0}) or {
        "user_id": DEMO_USER_ID, "balance": 0.0, "lifetime_earned": 0.0
    }
    payouts = await db.payouts.find(
        {"user_id": DEMO_USER_ID}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {
        "balance": round(wallet.get("balance", 0.0), 4),
        "lifetime_earned": round(wallet.get("lifetime_earned", 0.0), 4),
        "payouts": payouts,
    }


@api_router.post("/wallet/withdraw")
async def withdraw(req: WithdrawRequest):
    wallet = await db.wallets.find_one({"user_id": DEMO_USER_ID}, {"_id": 0})
    if not wallet or wallet.get("balance", 0.0) < req.amount:
        raise HTTPException(400, "Insufficient balance")
    if req.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    payout = {
        "id": f"pay_{uuid.uuid4().hex[:10]}",
        "user_id": DEMO_USER_ID,
        "amount": round(req.amount, 2),
        "status": "completed",
        "method": "USDC",
        "created_at": datetime.now(timezone.utc),
    }
    await db.payouts.insert_one(payout)
    await db.wallets.update_one(
        {"user_id": DEMO_USER_ID},
        {"$inc": {"balance": -req.amount}}
    )
    payout.pop("_id", None)
    return payout


@api_router.get("/profile")
async def get_profile():
    deps = await db.deployed_agents.find({"user_id": DEMO_USER_ID}, {"_id": 0}).limit(200).to_list(200)
    total_xp = sum(d.get("xp", 0) for d in deps)
    wallet = await db.wallets.find_one({"user_id": DEMO_USER_ID}, {"_id": 0}) or {}
    return {
        "user_id": DEMO_USER_ID,
        "handle": "@neon_runner",
        "tier": "OPERATOR_01",
        "joined": "2026-01-14",
        "total_agents": len(deps),
        "total_xp": total_xp,
        "lifetime_earned": round(wallet.get("lifetime_earned", 0.0), 2),
    }


@api_router.get("/categories")
async def categories():
    return [
        {"id": "all", "label": "All"},
        {"id": "trading", "label": "Trading"},
        {"id": "content", "label": "Content"},
        {"id": "social", "label": "Social"},
        {"id": "scraping", "label": "Scraping"},
        {"id": "tasks", "label": "Tasks"},
    ]


# ================== CLAUDE INSIGHTS ==================
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
INSIGHT_SYSTEM = (
    "You are the narrative voice of CASH CLAW, a cyberpunk AI-agent control deck. "
    "Given an agent's stats, write a TIGHT 2-sentence evolution log (max 35 words total) "
    "that sounds like a hacker terminal whisper: present tense, second person ('Your agent'), "
    "punchy, no emojis, no markdown, no quotes. Reference what the agent JUST learned or "
    "refined to reach this level, and hint at what it is hunting next."
)


async def _generate_insight(agent: dict, deployment: dict) -> str:
    if not EMERGENT_LLM_KEY:
        return ""
    prompt = (
        f"AGENT: {agent['name']} ({agent['category']})\n"
        f"PURPOSE: {agent['tagline']}\n"
        f"DESCRIPTION: {agent['description']}\n"
        f"LEVEL: {deployment['level']} | XP: {deployment['xp']} | "
        f"EARNED: ${deployment['earned_total']:.2f}\n"
        f"Write the evolution log now."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insight_{deployment['id']}_{deployment['level']}",
            system_message=INSIGHT_SYSTEM,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        response = await chat.send_message(UserMessage(text=prompt))
        return (response or "").strip()
    except Exception as e:
        logger.warning(f"insight generation failed: {e}")
        return ""


@api_router.get("/insight/{deployment_id}")
async def get_insight(deployment_id: str):
    dep = await db.deployed_agents.find_one({"id": deployment_id}, {"_id": 0})
    if not dep:
        raise HTTPException(404, "Deployment not found")
    agent = await db.agents.find_one({"id": dep["agent_id"]}, {"_id": 0})
    if not agent:
        raise HTTPException(404, "Agent not found")

    # tick first so we evaluate the latest level
    dep = await _tick_deployed(dep, agent)

    cached = await db.insights.find_one(
        {"deployment_id": deployment_id, "level": dep["level"]}, {"_id": 0}
    )
    if cached:
        return {
            "deployment_id": deployment_id,
            "level": dep["level"],
            "narrative": cached["narrative"],
            "generated_at": cached["generated_at"],
            "cached": True,
        }

    narrative = await _generate_insight(agent, dep)
    if not narrative:
        return {
            "deployment_id": deployment_id,
            "level": dep["level"],
            "narrative": "",
            "generated_at": None,
            "cached": False,
            "error": "insight_unavailable",
        }

    doc = {
        "deployment_id": deployment_id,
        "agent_id": dep["agent_id"],
        "level": dep["level"],
        "narrative": narrative,
        "generated_at": datetime.now(timezone.utc),
    }
    await db.insights.insert_one(doc)
    doc.pop("_id", None)
    return {**doc, "cached": False}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await seed_if_empty()
    logger.info("Cash Claw API started, seeded agents if empty.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
