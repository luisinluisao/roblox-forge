# roblox-forge

**Um estúdio de jogos com IA e portões de qualidade para o Roblox Studio.** Plugin do Claude Code que transforma "faz um jogo pra mim" em um pipeline de estúdio: documento de design → vertical slice → sistemas → arte → UI → "juice" → playtest → crítica → correção, repetido até todos os portões de qualidade passarem.

Ele controla seu Studio aberto pelo **servidor MCP nativo do Roblox** (edição de scripts, `execute_luau`, controle do play, simulação de input, **screenshots**, geração de malhas/materiais/modelos por IA, busca na Creator Store).

## Diferenciais
- **Fluxo de diretor** (`/roblox-forge:build`): GDD primeiro, depois um vertical slice em qualidade final, depois expansão.
- **Agentes especialistas**: engenheiro Luau, artista de level, designer de UI, QA e crítico visual.
- **Skills de especialista**: Luau estrito e server-authoritative, direção de arte anti-"quadrado", UI responsiva, game feel, pipeline de assets (gerar → verificar → integrar), protocolo de playtest.
- **Verificação de verdade**: auditoria de cena e de scripts, sonda de performance, testes de ataque nos remotes, crítica por screenshots com nota.
- **11 portões + hook de Stop**: a sessão não pode terminar até os portões passarem (com limite de segurança). Quem constrói não aprova o próprio trabalho.

## Requisitos
Roblox Studio atualizado com **Assistant → … → Manage MCP Servers → "Enable Studio as MCP server"**, Node.js 18+, Windows ou macOS, e um harness suportado: Claude Code, DeepSeek Harness, Mistral Vibe ou qualquer host que leia Agent Skills e MCP. O detalhe está em [docs/INSTALL.md](docs/INSTALL.md).

## Instalação
O mesmo instalador copia as skills, converte os agentes para o formato de cada harness e gera a conexão MCP.

```bash
git clone https://github.com/luisinluisao/roblox-forge.git
cd roblox-forge
node scripts/install-harness.mjs --list          # detecta os harnesses desta máquina
node scripts/install-harness.mjs --harness auto  # instala em todos os detectados
```

| Harness | Skills | Agentes | MCP do Studio |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/skills` | `~/.claude/agents/*.md` | `.mcp.json` do plugin |
| DeepSeek Harness | `~/.agents/skills` | arquivos em `agents/` | `cordis.patch.yml` gerado e `plugin_manager install_bundle` |
| Mistral Vibe | `~/.vibe/skills` | `~/.vibe/agents/*.toml` | comando `vibe mcp add` impresso pelo instalador |
| Codex, OpenCode, Cursor e outros | `~/.agents/skills` | não portável | trecho de MCP impresso e documentado em [docs/INSTALL.md](docs/INSTALL.md) |

No Claude Code os comandos com barra existem. Nos outros harnesses, invoque a skill pelo nome ou peça em palavras.

## Comandos
`/roblox-forge:setup` · `/roblox-forge:build <ideia>` · `/roblox-forge:polish [área]` · `/roblox-forge:qa [área]` · `/roblox-forge:stop`

Exemplo: `/roblox-forge:build um tycoon de pesca cooperativo e aconchegante, visual low-poly pastel, foco em celular, sessões de 10 minutos`

## Limites (honestos)
Ele maximiza a qualidade com processo, ferramentas e verificação, mas **não garante** um jogo "perfeito e sem bugs". O play automático não julga diversão nem rede real: faça playtests com pessoas (e celulares) antes de lançar. Um run completo pode gastar muitos tokens e tempo; o limite padrão é 30 continuações forçadas (`forge-state.mjs init --force --max-blocks N`). Trabalhe sempre em uma **cópia** do seu place.

## Licença
MIT
