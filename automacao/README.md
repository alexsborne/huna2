# Automação de atualização do painel

`atualizar.py` faz sozinho o ciclo completo: login no Imobmeet → extrai leads
e contatos de corretores → valida → `rebuild2.py` → publica em
`alexsborne/huna`. Não usa a API da Claude em nenhuma etapa — só Python e
Playwright, pensado para rodar sozinho no Agendador de Tarefas do Windows.

## 1. Instalar (uma vez)

```powershell
cd automacao
pip install -r requirements.txt
copy .env.example .env
notepad .env   # preencher IMOBMEET_USER e IMOBMEET_PASS
```

**Navegador usado: o Google Chrome instalado na máquina, não o Chromium do Playwright** — a pedido do usuário (09/09/2026), `atualizar.py` chama `p.chromium.launch(..., channel='chrome')`, que abre o Chrome real em vez de baixar/usar o Chromium interno do Playwright. Por isso `playwright install chromium` **não é necessário** — só precisa ter o Google Chrome instalado normalmente.

`.env` nunca é publicado — o script só copia `index.html` para o clone que vai
pro GitHub, nada mais desta pasta. Mesmo assim, não deixe o arquivo em lugar
público.

## 2. Modo sem senha nenhuma (`LOGIN_MODE=manual`) — testado e funcionando em 04/09/2026

Não precisa de `.env` nem de guardar senha em lugar nenhum: o script abre uma
janela **visível** do Chrome, você loga no Imobmeet nela normalmente (até
5 minutos de prazo), e a partir daí tudo roda sozinho — extração, validação,
rebuild e publicação — sem mais nenhuma interação. É o jeito mais rápido de
rodar uma atualização pontual (usado com sucesso em 04/09/2026 15:26,
178→182 cadastros, ~4 min do início ao fim, a maior parte esperando o login).

```powershell
python atualizar.py
```
(com a variável `LOGIN_MODE=manual` — no PowerShell: `$env:LOGIN_MODE="manual"; python atualizar.py`)

Só **não** serve para o agendamento sem supervisão (seção 5) — sem alguém pra
logar na janela no horário agendado, a execução trava esperando e expira em
5 min. Para isso, use o modo com usuário/senha no `.env` (seção 3 abaixo),
**verificado contra a tela real em 09/09/2026** (ver seção 8 do `CONTEXTO.md`).

## 3. Rodar com usuário/senha em `.env` (`LOGIN_MODE=auto`) — verificado em 09/09/2026

O login automático (`login()` em `atualizar.py`) já foi testado contra a tela
real do Imobmeet e funciona (achou e corrigiu 2 bugs no processo — URL de
login errada e um `<label for>` que não batia com o `id` do campo de senha no
próprio HTML do Imobmeet; detalhes no `CONTEXTO.md`, seção 8). Ainda assim,
se o Imobmeet mudar o layout de novo, rode com o navegador visível pra ver
onde trava:

```powershell
$env:HEADLESS="0"; $env:DRY_RUN="1"; python atualizar.py
```

Veja se o login realmente completa. Se travar ou não sair de `/login`, abra
`automacao\log.txt` para o motivo e ajuste a função `login()` (os seletores
`get_by_label`/`get_by_role` no topo do arquivo) conforme os campos reais da
tela — provavelmente só precisa trocar o texto do regex do rótulo ou o texto
do botão.

Depois de confirmar que o login funciona, rode uma vez completo (ainda em
modo seco, sem publicar) para conferir `dados/rows.json` e `index.html`
localmente:

```powershell
$env:DRY_RUN="1"; python atualizar.py
```

Só depois disso rode sem `DRY_RUN` (ou agende) para publicar de verdade.

## 4. O que o script faz, e onde ele para

1. Login no Imobmeet (Playwright, headless por padrão).
2. Extrai os leads do Funil de Pasta + ficha de cada um — mesma lógica de
   `extracao/01_leads_e_detalhes.js`, mas rodando dentro de `page.evaluate()`
   e devolvendo os dados **direto pro Python no retorno**, sem download nem
   truque de localStorage (isso só era necessário na extensão do navegador —
   ver `CONTEXTO.md`, armadilha 5. O Playwright não tem esse limite).
3. Para responsáveis que ainda não estão em `dados/contatos.tsv`, busca o
   contato via `extracao/02_contato_dos_corretores.js` (mesma lógica) e grava
   de volta no `contatos.tsv` — assim a base de contatos vai crescendo sozinha.
4. Converte tudo pro formato de `dados/rows.json`, reproduzindo em Python a
   lógica que estava documentada como manual/ad-hoc na seção 8 do
   `CONTEXTO.md` (split de `resp`/`funil`, parsing de `R$ ...`, `sem_email`,
   `dias_cadastro`/`semana` etc.).
5. **Roda as validações da seção 8 do `CONTEXTO.md`** — se qualquer uma
   falhar, o script **para ali, grava o motivo em `log.txt` e não toca em
   `dados/rows.json` nem publica nada**:
   - algum `lead_id` duplicado
   - `n_tags` não bate com `tags_list`
   - algum cadastro sem telefone/e-mail do corretor mesmo depois de buscar
   - alguma tag nova fora de `dados/catmap.json` (regra do projeto: tag nova
     exige decisão humana da categoria, nunca cai sozinha em `OUTROS`)
   - queda de mais de 50% no total de cadastros frente à execução anterior
     (sinal de falha silenciosa na extração, não uma queda real)
6. Só se passar em tudo: grava `dados/rows.json` (com backup do anterior em
   `automacao/backups/`), roda `python rebuild2.py`, gera `index.html` com os
   metas `noindex`, e publica num clone dedicado de `alexsborne/huna`
   (`automacao/_publish_clone/` — nunca mexe na pasta de trabalho do usuário).
7. Grava um resumo com timestamp em `automacao/log.txt`: quantos cadastros,
   quantas tags, quantos novos/sumidos frente à execução anterior.

## 5. Agendar no Windows

**Tarefa `NexoPainel-AtualizarDiario` registrada em 09/09/2026, diária às 17:59**, a pedido do usuário — roda `atualizar.py` sem `DRY_RUN` (publica direto) e com `LOGIN_MODE=auto` (usa o `.env`). Ver `CONTEXTO.md` seção 8 para o histórico da decisão (nuvem não serve porque tudo depende desta máquina) e da validação do login. Comando usado (ajustar caminhos se a máquina/pasta mudar):

```powershell
$python = (Get-Command python).Source
$acao = New-ScheduledTaskAction -Execute $python -Argument "atualizar.py" `
  -WorkingDirectory "C:\Users\alexandre.lopes\OneDrive\huna_trabalho\etapa_2\relatorio_pastas\Nexo_Painel_Contexto_Completo\handoff\automacao"
$gatilho = New-ScheduledTaskTrigger -Daily -At 17:59
Register-ScheduledTask -TaskName "NexoPainel-AtualizarDiario" -Action $acao -Trigger $gatilho `
  -Description "Atualiza o Painel do Funil de Pasta (Imobmeet -> rebuild -> GitHub Pages)" -RunLevel Limited
```

Só roda se o computador estiver ligado (não em suspensão) às 17:59 — não há execução "atrasada" automática ao acordar, a menos que se marque essa opção nas propriedades da tarefa (`Configurações` → "Executar a tarefa assim que possível após uma inicialização agendada perdida").

Conferir/gerenciar pela interface: **Agendador de Tarefas** (`taskschd.msc`) → procurar `NexoPainel-AtualizarDiario`. Ou por comando: `Get-ScheduledTask -TaskName NexoPainel-AtualizarDiario`, `Start-ScheduledTask -TaskName NexoPainel-AtualizarDiario` (roda agora, fora do horário), `Unregister-ScheduledTask -TaskName NexoPainel-AtualizarDiario` (remove).

**Antes de marcar como "pronto para produção":** deixe rodar sozinho por
alguns dias e confira `log.txt` de vez em quando — a extração já se mostrou
frágil no uso manual (Livewire que descola, paginação que não obedece, ver
`CONTEXTO.md` seção 2 "Armadilhas") e o objetivo das validações acima é
travar a publicação antes de qualquer coisa quebrada ir pro ar, mas vale
conferir que elas de fato estão disparando quando deveriam.

## 6. Variáveis de ambiente aceitas

| Variável | Padrão | Uso |
|---|---|---|
| `LOGIN_MODE` | `auto` | `manual` = humano loga numa janela visível (força `HEADLESS=0`, ignora usuário/senha); `auto` = usa `IMOBMEET_USER`/`IMOBMEET_PASS` |
| `IMOBMEET_USER` / `IMOBMEET_PASS` | — (obrigatórias se `LOGIN_MODE=auto`) | login automático |
| `IMOBMEET_BASE_URL` | `https://crm.imobmeet.com.br` | — |
| `IMOBMEET_LOGIN_URL` | `<BASE_URL>` (raiz do site — `/login` dá "página não encontrada", confirmado em 09/09/2026) | só usado em `LOGIN_MODE=auto` |
| `GIT_CLONE_DIR` | `automacao/_publish_clone` | onde o clone de publicação fica |
| `DRY_RUN` | `0` | `1` = roda tudo, mas não commita/publica |
| `HEADLESS` | `1` | `0` = abre o Chrome visível (depuração); sempre `0` em `LOGIN_MODE=manual` |

## 7. Se algo mudar no Imobmeet

O script depende de: nomes dos componentes Livewire (`leads-table`,
`users.list-users`), a URL `/leads/details/<id>` e `/users/edit/<id>`, os
seletores `#tagsSelect2`, `select[name=planodepagamento]`, e os rótulos de
texto da ficha (`Email:`, `Telefone:`, etc.). Se o Imobmeet mudar o layout,
o sintoma mais provável é a validação de "0 cadastros" ou "queda suspeita"
travando a publicação — o que é o comportamento desejado (falhar visível em
vez de publicar dado quebrado). Reveja `LEADS_JS`/`CONTATOS_JS` em
`atualizar.py` contra a página atual nesse caso.
