@echo off
echo ========================================
echo   Checking Server Status
echo ========================================
echo.

curl -X POST http://localhost:8000/graphql/ ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"query { products(first: 1) { edges { node { id name } } } }\"}"

echo.
echo.
echo If you see JSON response, server is working!
echo If you see error, check database connection.
echo.
pause

