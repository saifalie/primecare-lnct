# PrimeCare 🏥

**Your family's guardian. Always watching.**

A continuous AI-powered elderly health monitoring ecosystem.

## Three Products

| Product | Hardware | Role |
|---|---|---|
| PrimeBand | ESP32 + MAX30102 + MPU6050 | 24/7 wearable monitoring |
| PrimeStation | Raspberry Pi 5 | Home health station, AI diagnosis |
| PrimeCare App | React Native Expo Android | Family mobile visibility |

## Repository Structure

| Folder | Contents |
|---|---|
| `station/` | All Raspberry Pi Docker services |
| `app/` | React Native Expo Android app |
| `cloud/` | Railway cloud backend |

## What It Does

- Monitors HR, SpO2, Temperature, Fall Detection 24/7 via wearable band
- Deep 4-sensor checkup at home station in 4 minutes
- Silent AI analysis — compares to personal baseline, gives GREEN/YELLOW/RED risk
- Auto emergency chain — fall detected → SMS contacts → dials 112
- Family app with live vitals, push notifications, trend graphs, medication tracking

## Tech Stack

- **Hardware:** Raspberry Pi 5, ESP32, MAX30102, MLX90614, AD8232, MPU6050, SIM800L
- **AI:** OpenRouter (Llama 3.1 8B + Mistral 7B fallback), rule-based fallback
- **Backend:** Node.js + Python microservices, Docker, MQTT, WebSocket
- **Database:** SQLite local + MongoDB Atlas cloud
- **App:** React Native Expo Android

## Hackathon

BGI Hackathon 2026 — Problem Statement IT4P2
Theme: Healthcare Innovation
Team: Arch — Bansal Group of Institute, Indore
