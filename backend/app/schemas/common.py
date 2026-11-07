from pydantic import BaseModel, ConfigDict


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class CurrentUserRead(APIModel):
    sub: str
    username: str | None = None
    scope: str = ""


class ErrorResponse(BaseModel):
    detail: object
