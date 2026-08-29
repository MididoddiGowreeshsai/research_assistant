from pydantic import BaseModel


class ResearchRequest(BaseModel):
    topic: str


class ResumeRequest(BaseModel):
    approved: bool
    feedback: str = ""
