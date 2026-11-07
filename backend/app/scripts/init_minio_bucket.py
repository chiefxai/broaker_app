"""Wait for local MinIO and ensure the configured upload bucket exists."""

import asyncio
import os

import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError


async def ensure_bucket() -> None:
    endpoint = os.environ["S3_ENDPOINT_URL"]
    bucket = os.environ["S3_BUCKET_NAME"]
    session = aioboto3.Session()
    async with session.client(
        "s3",
        endpoint_url=endpoint,
        region_name=os.getenv("S3_REGION", "us-east-1"),
        aws_access_key_id=os.environ["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["S3_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    ) as client:
        for attempt in range(30):
            try:
                try:
                    await client.head_bucket(Bucket=bucket)
                except ClientError as error:
                    code = error.response.get("Error", {}).get("Code")
                    if code not in {"404", "NoSuchBucket", "NotFound"}:
                        raise
                    await client.create_bucket(Bucket=bucket)
                break
            except Exception:
                if attempt == 29:
                    raise
                await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(ensure_bucket())
