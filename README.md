# UrbanLabUFN

Plataforma web colaborativa para estudos urbanos, visualização cartográfica e análise da cidade de Santa Maria (RS).

**Coordenadores do projeto:** professores Cristian Fagundes e Mirkos Martins.

## Antes de começar

Cada aluno precisa instalar:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) versão 22.13 ou superior
- [Visual Studio Code](https://code.visualstudio.com/)
- Uma conta gratuita no [GitHub](https://github.com/)

Os alunos **não precisam ter uma conta no ChatGPT** para baixar, abrir ou editar o projeto.

## 1. Baixar o projeto

Abra o terminal do computador e execute:

```bash
git clone https://github.com/cvfagundes/urbanlabufn.git
cd urbanlabufn
```

Depois, abra a pasta `urbanlabufn` no Visual Studio Code.

## 2. Instalar o projeto

No terminal do Visual Studio Code, execute:

```bash
corepack enable
pnpm install
```

Essa instalação é necessária somente na primeira vez ou quando as dependências forem alteradas.

## 3. Abrir o UrbanLabUFN

Execute:

```bash
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador. Para encerrar o servidor, volte ao terminal e pressione `Ctrl + C`.

## Como usar o mapa

- **Mover o mapa:** clique e arraste com o botão esquerdo do mouse.
- **Aproximar ou afastar:** use a roda do mouse.
- **2D:** retorna à visualização superior plana.
- **Topografia:** ativa ou desativa o relevo. O botão fica verde quando a topografia está ligada.
- **3D:** inclina o mapa para visualizar o relevo.
- **Órbita:** no modo 3D, arraste com o botão direito do mouse ou pressione `Ctrl` enquanto arrasta com o botão esquerdo.

O mapa inicia próximo às coordenadas `-29.684930, -53.814122`, em Santa Maria. Em código, bibliotecas cartográficas normalmente usam a ordem **longitude, latitude**: `[-53.814122, -29.684930]`.

## Onde fazer alterações

- `app/page.tsx`: mapa, botões, textos e comportamento da página.
- `app/globals.css`: cores, tamanhos, espaçamentos e aparência visual.

Antes de alterar o código, crie uma branch para o seu grupo. Assim, cada equipe trabalha separadamente sem apagar o trabalho das demais.

## Fluxo recomendado para os grupos

### 1. Atualizar a versão principal

```bash
git switch main
git pull
```

### 2. Criar a branch do grupo

Substitua `grupo-mobilidade` pelo nome da equipe ou do tema:

```bash
git switch -c grupo-mobilidade
```

Sugestões de nomes:

- `grupo-mobilidade`
- `grupo-uso-do-solo`
- `grupo-ambiente`
- `grupo-patrimonio`
- `grupo-equipamentos`

### 3. Salvar e enviar as alterações

Depois de editar e testar o projeto:

```bash
git add .
git commit -m "Descreva brevemente a alteração"
git push -u origin grupo-mobilidade
```

Use no último comando o mesmo nome escolhido para a branch. Em seguida, abra o repositório no GitHub e crie um **Pull Request** para a branch `main`. Os coordenadores poderão revisar e reunir as contribuições.

### 4. Receber atualizações da turma

Antes de continuar o trabalho em uma branch já existente:

```bash
git switch main
git pull
git switch grupo-mobilidade
git merge main
```

Troque `grupo-mobilidade` pelo nome da sua branch.

## Organização dos dados

Arquivos pequenos, como GeoJSON e CSV, podem ser adicionados ao repositório quando forem necessários ao projeto. Arquivos muito grandes, como GeoTIFF, modelos 3D, imagens de alta resolução e bases completas do OpenStreetMap, devem ser armazenados externamente e documentados com um link.

Nunca envie a pasta `node_modules` ao GitHub; ela é recriada automaticamente pelo comando `pnpm install`.

## Problemas comuns

Confira as versões instaladas:

```bash
node --version
pnpm --version
git --version
```

Se o projeto não abrir depois de uma atualização, tente executar novamente:

```bash
pnpm install
pnpm dev
```

Se aparecer um erro que o grupo não consegue resolver, copie a mensagem completa e informe também qual comando foi executado.
