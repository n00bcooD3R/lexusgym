from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

# Import routes
from api.routes import settings, members, wa, payments, statistics, cron, pt

app = FastAPI(
    title="Lexus Gym API Backend",
    description="FastAPI Backend for Lexus Fitness Group Manager",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Configure CORS for local development (React Web & React Native)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(settings.router)
app.include_router(members.router)
app.include_router(wa.router)
app.include_router(payments.router)
app.include_router(statistics.router)
app.include_router(cron.router)
app.include_router(pt.router)


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "Lexus Gym API"}

# ASGI handler for Vercel serverless integration
handler = Mangum(app)
