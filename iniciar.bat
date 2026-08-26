@echo off
setlocal
cd /d "%~dp0"
title UrbanLabUFN

echo.
echo ========================================
echo            UrbanLabUFN
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 goto node_missing

where npm >nul 2>&1
if errorlevel 1 goto npm_missing

if not exist package.json goto wrong_folder

if not exist node_modules (
  echo Preparando o projeto pela primeira vez...
  echo Este processo pode levar alguns minutos.
  echo.
  call npm install --no-package-lock
  if errorlevel 1 goto install_failed
)

echo Iniciando o mapa...
echo O navegador sera aberto automaticamente.
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"
call npm run dev
goto end

:node_missing
echo ERRO: O Node.js nao esta instalado.
echo Instale a versao LTS em https://nodejs.org/ e tente novamente.
goto pause_end

:npm_missing
echo ERRO: O npm nao foi encontrado.
echo Reinstale o Node.js LTS em https://nodejs.org/ e tente novamente.
goto pause_end

:wrong_folder
echo ERRO: O arquivo iniciar.bat precisa permanecer dentro da pasta urbanlabufn.
goto pause_end

:install_failed
echo.
echo ERRO: Nao foi possivel instalar os componentes do projeto.
echo Verifique a conexao com a internet e tente novamente.

:pause_end
echo.
pause

:end
endlocal
