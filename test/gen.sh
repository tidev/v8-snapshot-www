#!/bin/sh

curl -X POST -H "Content-Type: application/json" -d @payload.json http://localhost:3000/gen
