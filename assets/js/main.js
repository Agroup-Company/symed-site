/* SYMED - interações do site */
(() => {
  const root = document.documentElement;
  const WHATS = '553599520315';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Entrada do hero */
  const iniciar = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('pronto')));
  const foto = $('.hero__foto');
  if (foto && !foto.complete) {
    foto.addEventListener('load', iniciar, { once: true });
    setTimeout(iniciar, 1200);
  } else iniciar();

  /* Hero em tela cheia: o topo do escudo acompanha o início do título */
  const heroGrid = $('.hero__grid'), heroTitulo = $('.hero__titulo');
  if (heroGrid && heroTitulo) {
    const alinha = () => {
      if (matchMedia('(max-width: 900px)').matches) return heroGrid.style.removeProperty('--topo-visual');
      const d = heroTitulo.getBoundingClientRect().top - heroGrid.getBoundingClientRect().top;
      heroGrid.style.setProperty('--topo-visual', Math.max(0, d - 14).toFixed(0) + 'px');
    };
    alinha();
    addEventListener('resize', alinha);
    document.fonts && document.fonts.ready.then(alinha);
  }

  /* Ponto de luz do hero segue o mouse (suavizado) */
  const hero = $('.hero');
  if (hero && !reduz && matchMedia('(pointer: fine)').matches) {
    let alvoX, alvoY, x, y, rodando = false;
    const centro = () => {
      const v = $('.hero__visual').getBoundingClientRect(), h = hero.getBoundingClientRect();
      return [v.left - h.left + v.width / 2, v.top - h.top + v.height * .45];
    };
    [x, y] = [alvoX, alvoY] = centro();
    const passo = () => {
      x += (alvoX - x) * .08; y += (alvoY - y) * .08;
      hero.style.setProperty('--mx', x.toFixed(1) + 'px');
      hero.style.setProperty('--my', y.toFixed(1) + 'px');
      if (Math.abs(alvoX - x) > .5 || Math.abs(alvoY - y) > .5) requestAnimationFrame(passo); else rodando = false;
    };
    const mover = (nx, ny) => { alvoX = nx; alvoY = ny; if (!rodando) { rodando = true; requestAnimationFrame(passo); } };
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mover(e.clientX - r.left, e.clientY - r.top); });
    hero.addEventListener('pointerleave', () => mover(...centro()));
    mover(...centro());
  }

  /* Topo: sólido ao rolar, some ao descer, volta ao subir */
  const topo = $('[data-topo]');
  const flutuante = $('.whats-flutuante');
  let ultimoY = scrollY;
  const aoRolar = () => {
    const y = scrollY;
    topo.classList.toggle('topo--solido', y > 40);
    const descendo = y > ultimoY && y > 600;
    if (!document.body.classList.contains('menu-aberto')) topo.classList.toggle('topo--oculto', descendo);
    flutuante && flutuante.classList.toggle('escondido', y < innerHeight * .6);
    ultimoY = y;
  };
  addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  /* Menu mobile */
  const burger = $('[data-burger]');
  const menu = $('#menu');
  const fecharMenu = () => {
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('menu--aberto');
    document.body.classList.remove('menu-aberto');
    document.body.style.overflow = '';
  };
  burger.addEventListener('click', () => {
    const abrir = burger.getAttribute('aria-expanded') !== 'true';
    if (!abrir) return fecharMenu();
    burger.setAttribute('aria-expanded', 'true');
    menu.classList.add('menu--aberto');
    document.body.classList.add('menu-aberto');
    document.body.style.overflow = 'hidden';
    topo.classList.remove('topo--oculto');
  });
  $$('a', menu).forEach(a => a.addEventListener('click', fecharMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('menu--aberto')) { fecharMenu(); burger.focus(); } });
  matchMedia('(min-width: 1021px)').addEventListener('change', e => e.matches && fecharMenu());

  /* Link ativo no menu */
  const links = $$('.menu ul a');
  const secoes = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const obsMenu = new IntersectionObserver(entradas => {
    entradas.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id ? 'true' : 'false'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secoes.forEach(s => obsMenu.observe(s));

  /* Marquee: duplica os logos para o loop contínuo */
  const trilho = $('.marquee__trilho');
  if (trilho) $$('img', trilho).forEach(img => { const c = img.cloneNode(); c.alt = ''; c.setAttribute('aria-hidden', 'true'); trilho.appendChild(c); });

  /* Revelação suave dos blocos */
  const revelar = $$('.secao__topo, .sobre__intro, .abas, .diag__intro, .diag__form, .tipos-aso, .exames__grade, .incompany__foto, .incompany__texto, .nrs, .faq__grid > div, .contato__info, .form');
  if (!reduz && 'IntersectionObserver' in window) {
    revelar.forEach(el => el.classList.add('revela'));
    const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visivel'); obs.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    revelar.forEach(el => obs.observe(el));
  }

  /* Símbolo animado do in company: roda só enquanto a seção está na tela */
  const traco = $('[data-traco]');
  if (traco && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => traco.classList.toggle('em-cena', e.isIntersecting)), { threshold: .15 }).observe(traco);
  }

  /* Linha do tempo acompanha a rolagem */
  const linha = $('[data-linha]');
  if (linha) {
    const itens = $$('li', linha);
    let pedido = false;
    const atualiza = () => {
      pedido = false;
      const r = linha.getBoundingClientRect();
      const alvo = innerHeight * .62;
      const prog = Math.min(1, Math.max(0, (alvo - r.top) / r.height));
      linha.style.setProperty('--prog', prog.toFixed(3));
      itens.forEach(li => li.classList.toggle('ativo', li.getBoundingClientRect().top + 18 < alvo));
    };
    addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(atualiza); } }, { passive: true });
    atualiza();
  }

  /* Abas (programas e laudos) */
  $$('[data-abas]').forEach(box => {
    const tabs = $$('[role="tab"]', box);
    const ativar = (tab, foco) => {
      tabs.forEach(t => {
        const sel = t === tab;
        t.setAttribute('aria-selected', sel);
        t.tabIndex = sel ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !sel;
      });
      if (foco) tab.focus();
      if (matchMedia('(max-width: 860px)').matches) tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduz ? 'auto' : 'smooth' });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => ativar(t));
      t.addEventListener('keydown', e => {
        const mapa = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (e.key in mapa) { e.preventDefault(); ativar(tabs[(i + mapa[e.key] + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); ativar(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); ativar(tabs[tabs.length - 1], true); }
      });
    });
  });

  /* Acordeões exclusivos (fallback para navegadores sem details[name]) */
  if (!('name' in HTMLDetailsElement.prototype)) {
    $$('details[name]').forEach(d => d.addEventListener('toggle', () => {
      if (d.open) $$(`details[name="${d.getAttribute('name')}"]`).forEach(o => o !== d && (o.open = false));
    }));
  }

  /* Diagnóstico de conformidade */
  const diag = $('[data-diag]');
  if (diag) {
    const perguntas = $$('.diag__lista li', diag);
    const total = perguntas.length;
    const escudo = $('.diag__escudo');
    const placar = $('[data-placar]');
    const msg = $('[data-msg]');
    const botao = $('[data-diag-whats]');
    const svg = $('svg', escudo);
    const atualiza = () => {
      let ok = 0, respondidas = 0;
      const pendentes = [];
      perguntas.forEach(li => {
        const r = $('input:checked', li);
        li.classList.remove('r-sim', 'r-nao', 'r-nao-sei');
        if (!r) return;
        respondidas++;
        li.classList.add('r-' + r.value);
        if (r.value === 'sim') ok++; else pendentes.push(li.dataset.item + (r.value === 'nao-sei' ? ' (não sei)' : ''));
      });
      placar.textContent = ok;
      svg.style.setProperty('--nivel', (ok / total).toFixed(3));
      escudo.dataset.estado = ok === total ? 'ok' : ok >= Math.ceil(total / 2) ? 'meio' : 'baixo';
      placar.parentElement.classList.toggle('ok', ok === total);
      if (!respondidas) { msg.textContent = 'Responda as perguntas para ver o resultado.'; botao.hidden = true; return; }
      if (respondidas < total) {
        msg.textContent = `Faltam ${total - respondidas} ${total - respondidas === 1 ? 'pergunta' : 'perguntas'}. Até aqui, ${pendentes.length ? pendentes.length + (pendentes.length === 1 ? ' ponto precisa' : ' pontos precisam') + ' de atenção.' : 'tudo certo.'}`;
      } else if (!pendentes.length) {
        msg.textContent = 'Sua empresa parece estar em dia. Quer que a gente confirme com uma análise dos documentos?';
      } else {
        msg.textContent = `${pendentes.length} ${pendentes.length === 1 ? 'ponto precisa' : 'pontos precisam'} de atenção. Um especialista da SYMED pode verificar e resolver com você.`;
      }
      const texto = `Olá! Fiz o diagnóstico no site da SYMED.\nItens em dia: ${ok} de ${total}.` + (pendentes.length ? `\nPontos de atenção:\n- ${pendentes.join('\n- ')}` : '') + '\nGostaria de conversar com um especialista.';
      botao.href = `https://wa.me/${WHATS}?text=${encodeURIComponent(texto)}`;
      botao.hidden = false;
    };
    diag.addEventListener('change', atualiza);
    diag.addEventListener('submit', e => e.preventDefault());
  }

  /* Formulário de agendamento: envia pelo WhatsApp com tudo preenchido */
  const form = $('[data-form]');
  if (form) {
    const status = $('[data-status]');
    const enviar = $('[data-enviar]');
    const dica = $('[data-dica]');
    const soEmpresa = $$('[data-so-empresa]', form);
    const data = $('input[type="date"]', form);
    if (data) data.min = new Date().toISOString().slice(0, 10);

    const montarMensagem = fd => {
      const empresa = fd.get('tipo') === 'empresa';
      const exames = fd.getAll('exames[]');
      const obs = String(fd.get('mensagem') || '').trim();
      const linhas = [
        `Olá! Vim pelo site e gostaria de agendar ${exames.length > 1 ? 'estes exames' : 'este exame'}:`,
        `*${exames.join(', ')}*`,
        '',
        `*Nome:* ${String(fd.get('nome')).trim()}`,
        empresa ? `*Empresa:* ${String(fd.get('empresa')).trim()}` : '*Tipo:* Colaborador / particular',
        empresa && fd.get('colaboradores') ? `*Colaboradores:* ${fd.get('colaboradores')}` : null,
        fd.get('data') ? `*Data de preferência:* ${String(fd.get('data')).split('-').reverse().join('/')}` : null,
        obs ? `*Observações:* ${obs}` : null
      ].filter(l => l !== null);
      return `https://wa.me/${WHATS}?text=${encodeURIComponent(linhas.join('\n'))}`;
    };

    const atualizar = () => {
      const fd = new FormData(form);
      const empresa = fd.get('tipo') === 'empresa';
      const faltam = [];
      if (String(fd.get('nome')).trim().length < 3) faltam.push('seu nome');
      if (empresa && String(fd.get('empresa')).trim().length < 2) faltam.push('o nome da empresa');
      if (!fd.getAll('exames[]').length) faltam.push('pelo menos um exame');
      status.textContent = '';
      if (faltam.length) {
        const lista = faltam.length > 1 ? faltam.slice(0, -1).join(', ') + ' e ' + faltam[faltam.length - 1] : faltam[0];
        dica.textContent = `Para enviar, preencha ${lista}.`;
        dica.hidden = false;
        enviar.hidden = true;
      } else {
        enviar.href = montarMensagem(fd);
        dica.hidden = true;
        enviar.hidden = false;
      }
    };

    form.addEventListener('change', e => {
      if (e.target.name === 'tipo') soEmpresa.forEach(el => el.hidden = e.target.value !== 'empresa');
      atualizar();
    });
    form.addEventListener('input', atualizar);
    form.addEventListener('submit', e => { e.preventDefault(); if (!enviar.hidden) enviar.click(); });
    enviar.addEventListener('click', () => {
      setTimeout(() => {
        status.className = 'form__status ok';
        status.textContent = 'Abrimos o WhatsApp com a sua solicitação. É só tocar em enviar para concluir.';
      }, 400);
    });
    atualizar();
  }

  /* Botões de WhatsApp com mensagem pronta para cada assunto */
  $$('[data-zap]').forEach(a => { a.href = `https://wa.me/${WHATS}?text=${encodeURIComponent(a.dataset.zap)}`; });

  /* "Agendar este exame": marca o exame no formulário e leva até ele */
  $$('[data-agendar]').forEach(link => link.addEventListener('click', e => {
    const form = $('[data-form]');
    if (!form) return;
    e.preventDefault();
    const chip = $$('input[name="exames[]"]', form).find(i => i.value === link.dataset.agendar);
    if (chip) chip.checked = true;
    const grupo = chip ? chip.closest('.form__exames') : form;
    $('#contato').scrollIntoView({ behavior: reduz ? 'auto' : 'smooth' });
    grupo.classList.remove('campo--destaque');
    void grupo.offsetWidth;
    grupo.classList.add('campo--destaque');
    setTimeout(() => form.nome.focus({ preventScroll: true }), reduz ? 0 : 700);
  }));

  /* Treinamentos: clicar na NR abre os detalhes */
  const nrBotoes = $$('.nr');
  const fecharNr = () => nrBotoes.forEach(b => { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; });
  nrBotoes.forEach(btn => btn.addEventListener('click', () => {
    const abrir = btn.getAttribute('aria-expanded') !== 'true';
    fecharNr();
    if (!abrir) return;
    btn.setAttribute('aria-expanded', 'true');
    const painel = $('#' + btn.getAttribute('aria-controls'));
    painel.hidden = false;
    const r = painel.getBoundingClientRect();
    if (r.bottom > innerHeight || r.top < 80) painel.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: r.height > innerHeight - 120 ? 'start' : 'nearest' });
  }));
  $$('.nr-painel__fechar').forEach(b => b.addEventListener('click', () => {
    const aberto = nrBotoes.find(n => n.getAttribute('aria-expanded') === 'true');
    fecharNr();
    aberto && aberto.focus();
  }));

  /* Medição (Google Tag Manager): cada ação importante vira um evento no dataLayer */
  const medir = (evento, dados = {}) => { (window.dataLayer = window.dataLayer || []).push({ event: evento, ...dados }); };
  const texto = el => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href*="wa.me"]');
    if (!link) return;
    if (link.matches('[data-enviar]')) {
      const fd = new FormData($('[data-form]'));
      medir('agendamento_whatsapp', {
        tipo_cliente: fd.get('tipo') === 'empresa' ? 'empresa' : 'particular',
        exames: fd.getAll('exames[]').join(', '),
        colaboradores: fd.get('colaboradores') || ''
      });
      return;
    }
    if (link.matches('[data-diag-whats]')) {
      medir('diagnostico_whatsapp', { itens_em_dia: Number($('[data-placar]').textContent) || 0 });
      return;
    }
    let origem = 'conteudo';
    if (link.closest('.whats-flutuante')) origem = 'botao_flutuante';
    else if (link.closest('.topo')) origem = 'menu';
    else if (link.closest('.rodape')) origem = 'rodape';
    else if (link.closest('.nr-painel')) origem = 'treinamento_' + link.closest('.nr-painel').id.replace('det-', '');
    else if (link.closest('.painel')) origem = 'programa_' + link.closest('.painel').id.replace('p-', '');
    else if (link.closest('section[id]')) origem = link.closest('section[id]').id;
    medir('clique_whatsapp', { origem, texto_botao: texto(link) });
  });

  $$('[data-agendar]').forEach(l => l.addEventListener('click', () => medir('agendar_exame_card', { exame: l.dataset.agendar })));
  $$('.abas__lista [role="tab"]').forEach(t => t.addEventListener('click', () => medir('ver_programa', { programa: texto($('b', t)) })));
  $$('.exame').forEach(d => d.addEventListener('toggle', () => { if (d.open) medir('ver_exame', { exame: texto($('.exame__nome', d)) }); }));
  $$('.nr').forEach(b => b.addEventListener('click', () => { if (b.getAttribute('aria-expanded') === 'true') medir('ver_treinamento', { treinamento: texto($('b', b)) + ' ' + texto($('span', b)) }); }));

  const diagForm = $('[data-diag]');
  if (diagForm) {
    let concluido = false;
    diagForm.addEventListener('change', () => {
      const respostas = $$('input[type="radio"]:checked', diagForm);
      if (concluido || respostas.length < $$('.diag__lista li', diagForm).length) return;
      concluido = true;
      medir('diagnostico_concluido', { itens_em_dia: respostas.filter(r => r.value === 'sim').length });
    });
  }

  /* Aviso de cookies (LGPD) ligado ao modo de consentimento do Google */
  const aviso = $('[data-cookies]');
  if (aviso) {
    const ler = () => { try { return localStorage.getItem('symed_cookies'); } catch (e) { return null; } };
    const salvar = v => { try { localStorage.setItem('symed_cookies', v); } catch (e) {} };
    const decidir = aceito => {
      const valor = aceito ? 'granted' : 'denied';
      gtag('consent', 'update', { ad_storage: valor, ad_user_data: valor, ad_personalization: valor, analytics_storage: valor });
      salvar(aceito ? 'aceito' : 'recusado');
      medir('consentimento_cookies', { escolha: aceito ? 'aceito' : 'recusado' });
      aviso.hidden = true;
      document.body.classList.remove('com-cookies');
    };
    $('[data-cookies-aceitar]').addEventListener('click', () => decidir(true));
    $('[data-cookies-recusar]').addEventListener('click', () => decidir(false));
    $$('[data-abrir-cookies]').forEach(b => b.addEventListener('click', () => { aviso.hidden = false; document.body.classList.add('com-cookies'); $('[data-cookies-aceitar]').focus(); }));
    if (!ler()) setTimeout(() => { aviso.hidden = false; document.body.classList.add('com-cookies'); }, 1200);
  }

  const ano = $('[data-ano]');
  if (ano) ano.textContent = new Date().getFullYear();
})();
