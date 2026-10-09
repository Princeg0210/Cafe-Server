import json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSockets"])


class ConnectionManager:
    def __init__(self):
        # Channel active connections: channel_name -> Set[WebSocket]
        self.channels: Dict[str, Set[WebSocket]] = {
            "kitchen": set(),
            "pos": set(),
            "orders": set(),
            "tables": set(),
            "menu": set(),
            "admin": set(),
        }

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel in self.channels:
            self.channels[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.channels and websocket in self.channels[channel]:
            self.channels[channel].remove(websocket)

    async def broadcast(self, channel: str, message: dict):
        if channel in self.channels:
            payload = json.dumps(message)
            dead_sockets = set()
            for connection in list(self.channels[channel]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                if dead in self.channels[channel]:
                    self.channels[channel].remove(dead)


ws_manager = ConnectionManager()


@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    if channel not in ws_manager.channels:
        await websocket.close(code=4000, reason="Invalid WebSocket channel.")
        return

    await ws_manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back ping / handle message
            await websocket.send_text(json.dumps({"type": "PONG", "received": data}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)
