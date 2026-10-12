from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os
from pathlib import Path


class Settings(BaseSettings):
    host: str = Field(default="127.0.0.1", description="Backend host to bind")
    port: int = Field(default=8000, description="Backend port")
    debug: bool = Field(default=False, description="Debug mode")

    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://192.168.100.7:5173",
        description="Comma-separated allowed origins",
    )

    # Huawei HG8145V6 defaults
    router_ip: str = Field(default="192.168.100.1", description="Router gateway IP")
    router_port: int = Field(default=443, description="Router web interface port")
    router_protocol: str = Field(default="https", description="Router protocol: https or http")

    # Local Network
    network_interface: str = Field(default="wlan0", description="Primary network interface")
    network_subnet: str = Field(default="192.168.100.0/24", description="Local subnet to discover")

    # Scanning parameters
    scan_timeout_seconds: float = Field(default=2.5, description="Per-probe timeout in seconds")
    max_scan_workers: int = Field(default=40, description="Max concurrent probe workers")
    internet_check_host: str = Field(default="1.1.1.1", description="External IP to check for WAN connectivity")

    # SQLite Database
    database_path: str = Field(default="data/homenet.db", description="Relative or absolute path to SQLite file")

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def resolved_db_path(self) -> Path:
        base_dir = Path(__file__).resolve().parent.parent
        p = Path(self.database_path)
        if not p.is_absolute():
            p = base_dir / p
        p.parent.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
