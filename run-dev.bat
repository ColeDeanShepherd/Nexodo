@echo off
echo Building client...
cd client
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Client build failed!
    pause
    exit /b %errorlevel%
)

echo Client built successfully!
echo Starting server...
cd ..
python -m server.app