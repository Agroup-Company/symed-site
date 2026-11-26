# SYMED - Medicina e Segurança do Trabalho

Site institucional (one-page) da SYMED, em Andradas-MG.
HTML, CSS e JavaScript puros, sem etapa de build, mais um `enviar.php` para o formulário.

## Estrutura

```
index.html            página
enviar.php            recebe o formulário e envia por e-mail (PHP mail)
.htaccess             HTTPS, cache, compressão, segurança
.cpanel.yml           deploy automático pelo Git do cPanel
robots.txt / sitemap.xml
assets/css/style.css
assets/js/main.js
assets/img/           logo SYMED em SVG (cor, branco, azul), símbolo, fotos, parceiros
```

## Rodar localmente

```
npx http-server -p 5180 -c-1
```

O formulário só envia de verdade no servidor (PHP). Localmente ele mostra o link de envio pelo WhatsApp como alternativa.

## Antes de publicar

1. O formulário envia por SMTP na conta atendimento@sym.med.br (Titan). A senha fica fora do repositório, no servidor, em `/home2/limase07/symed-smtp.php`:
   ```php
   <?php
   return ['senha' => 'SENHA_DO_EMAIL'];
   ```
   Se a senha do e-mail mudar, atualize esse arquivo.
2. Faça backup do WordPress atual (cPanel > Backup) e mova os arquivos antigos de `public_html` para uma pasta, por exemplo `public_html/_wp-antigo`.

## Deploy na HostGator (cPanel > Git™ Version Control)

1. Suba este repositório para o GitHub da agência.
2. No cPanel, abra **Git™ Version Control > Create**, ative **Clone a Repository** e cole a URL do repositório.
   Em **Repository Path** use uma pasta fora do site, por exemplo `repositories/symed`.
3. Depois de clonado, vá em **Manage > Pull or Deploy** e clique em **Deploy HEAD Commit**.
   O `.cpanel.yml` copia os arquivos para `public_html`.
4. Para atualizar: `git push` no GitHub, depois **Update from Remote** e **Deploy HEAD Commit** no cPanel.

Repositório privado: adicione a chave SSH do cPanel (SSH Access > Manage SSH Keys) como Deploy Key no GitHub e use a URL `git@github.com:...`.
