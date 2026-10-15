const CHAVE_RASCUNHO = 'gerador-prompts:rascunho';

const MODELOS = {
  marketing: {
    nome: 'Texto de marketing',
    papel: 'um redator publicitário sênior especializado em conversão',
    tarefa: 'Escreva um texto de divulgação para [produto ou serviço].',
    publico: '[descreva o cliente ideal]',
    formato: 'Post para redes sociais',
    tom: 'Persuasivo',
    tamanho: 'Curto (até 100 palavras)',
    restricoes: 'Inclua uma chamada para ação no final\nEvite promessas exageradas',
  },
  codigo: {
    nome: 'Ajuda com código',
    papel: 'um engenheiro de software sênior e revisor de código cuidadoso',
    tarefa: 'Explique e corrija o problema no código abaixo.',
    contexto: 'Linguagem: [linguagem]\nErro: [mensagem de erro]\n\n[cole o código aqui]',
    formato: 'Passo a passo numerado',
    tom: 'Técnico',
    restricoes: 'Mostre o código corrigido completo\nExplique a causa do erro antes da solução',
    passoAPasso: true,
  },
  estudo: {
    nome: 'Explicar um assunto',
    papel: 'um professor paciente e didático',
    tarefa: 'Explique [assunto] de forma simples.',
    publico: 'iniciante, sem conhecimento prévio',
    formato: 'Lista com tópicos',
    tom: 'Didático',
    tamanho: 'Médio (100 a 300 palavras)',
    restricoes: 'Use uma analogia do dia a dia\nTermine com 3 perguntas para fixação',
  },
  email: {
    nome: 'E-mail profissional',
    papel: 'um assistente executivo experiente em comunicação corporativa',
    tarefa: 'Escreva um e-mail para [destinatário] sobre [assunto].',
    contexto: '[o que aconteceu e o que você precisa]',
    formato: 'E-mail',
    tom: 'Profissional',
    tamanho: 'Curto (até 100 palavras)',
    restricoes: 'Inclua um assunto para o e-mail\nSeja cordial e direto',
  },
};

const form = document.getElementById('form');
const saida = document.getElementById('saida');
const contador = document.getElementById('contador');
const botaoCopiar = document.getElementById('copiar');
const aviso = document.getElementById('aviso');
const seletorModelo = document.getElementById('modelo');
const formato = document.getElementById('formato');
const formatoOutro = document.getElementById('formatoOutro');

const campos = () => Array.from(form.elements).filter((el) => el.name);

function lerValores() {
  const v = {};
  for (const el of campos()) {
    v[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
  }
  return v;
}

function aplicarValores(valores) {
  for (const el of campos()) {
    if (el.type === 'checkbox') el.checked = Boolean(valores[el.name]);
    else el.value = valores[el.name] ?? (el.tagName === 'SELECT' ? el.options[0].value : '');
  }
  atualizarFormatoOutro();
}

function montarPrompt(v) {
  if (!v.tarefa) return '';

  const partes = [];

  if (v.papel) partes.push(`Atue como ${v.papel}.`);

  partes.push(`## Tarefa\n${v.tarefa}`);

  if (v.contexto) partes.push(`## Contexto\n${v.contexto}`);
  if (v.publico) partes.push(`## Público-alvo\n${v.publico}`);

  const formatoFinal = v.formato === 'outro' ? v.formatoOutro : v.formato;
  const resposta = [];
  if (formatoFinal) resposta.push(`- Formato: ${formatoFinal}`);
  if (v.tom) resposta.push(`- Tom: ${v.tom}`);
  if (v.tamanho) resposta.push(`- Tamanho: ${v.tamanho}`);
  if (v.idioma) resposta.push(`- Idioma: ${v.idioma}`);
  if (resposta.length) partes.push(`## Formato da resposta\n${resposta.join('\n')}`);

  const regras = v.restricoes
    .split('\n')
    .map((r) => r.trim().replace(/^[-*•]\s*/, ''))
    .filter(Boolean);
  if (v.semInventar) regras.push('Não invente dados, nomes ou números. Se não souber algo, diga claramente.');
  if (regras.length) partes.push(`## Regras\n${regras.map((r) => `- ${r}`).join('\n')}`);

  if (v.exemplos) partes.push(`## Exemplo de referência\n"""\n${v.exemplos}\n"""`);

  const instrucoes = [];
  if (v.perguntar) instrucoes.push('Se faltar alguma informação importante, faça perguntas antes de responder.');
  if (v.passoAPasso) instrucoes.push('Pense passo a passo antes de dar a resposta final.');
  if (instrucoes.length) partes.push(instrucoes.join('\n'));

  return partes.join('\n\n');
}

function atualizar() {
  const valores = lerValores();
  const prompt = montarPrompt(valores);

  if (prompt) {
    saida.textContent = prompt;
    saida.classList.remove('vazia');
  } else {
    saida.textContent = 'Preencha pelo menos o campo "Tarefa" para gerar o prompt.';
    saida.classList.add('vazia');
  }
  botaoCopiar.disabled = !prompt;
  contador.textContent = `${prompt.length} caracteres`;

  try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(valores)); } catch (_) { /* sem armazenamento */ }
}

function atualizarFormatoOutro() {
  formatoOutro.classList.toggle('oculto', formato.value !== 'outro');
}

async function copiar() {
  const texto = saida.textContent;
  try {
    await navigator.clipboard.writeText(texto);
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = texto;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  aviso.textContent = 'Prompt copiado! Agora é só colar na IA.';
  clearTimeout(copiar.timer);
  copiar.timer = setTimeout(() => { aviso.textContent = ''; }, 2500);
}

for (const [id, modelo] of Object.entries(MODELOS)) {
  seletorModelo.add(new Option(modelo.nome, id));
}

seletorModelo.addEventListener('change', () => {
  const modelo = MODELOS[seletorModelo.value];
  aplicarValores(modelo || {});
  atualizar();
});

formato.addEventListener('change', atualizarFormatoOutro);
form.addEventListener('input', atualizar);
form.addEventListener('change', atualizar);
botaoCopiar.addEventListener('click', copiar);

document.getElementById('limpar').addEventListener('click', () => {
  seletorModelo.value = '';
  aplicarValores({});
  atualizar();
});

try {
  const salvo = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO));
  if (salvo) aplicarValores(salvo);
} catch (_) { /* rascunho inválido ou sem armazenamento */ }

atualizar();
