# UMBRA // Silent Ops — Publicar en Vercel

Sitio estático (HTML + JS, sin build, sin `npm install`). Mismo flujo que AXION: Git → GitHub (gh CLI) → Vercel.

## 1. Probar local (opcional)
```powershell
cd "C:\Users\jlrui\Desktop\Claude\04_SAAS\Umbra_Silent_Ops"
npx serve .
```
Abre http://localhost:3000 · Para ver todos los niveles desbloqueados: `http://localhost:3000/?debug`

## 2. Subir a GitHub
```powershell
git init -b main
git add .
git commit -m "feat: UMBRA Silent Ops v0.1.0"
gh repo create marketingorionmedia-ai/umbra-silent-ops --public --source=. --remote=origin --push
```

## 3. Conectar Vercel
- **Web:** vercel.com/new → Import `umbra-silent-ops` → Framework Preset: **Other** → Build Command y Output Directory **vacíos** → Deploy.
- **CLI:** `vercel link` → `vercel --prod` (cuando pregunte por build/output, deja los valores por defecto/vacíos).
- Cada `git push` a `main` redeploya solo.

## 4. Actualizar
```powershell
git add .
git commit -m "feat: ..."
git push
```
Si cambias el juego, sube el número en `sw.js` (`umbra-v1` → `umbra-v2`) para que las apps instaladas tomen la versión nueva.

## 5. Quitar noindex (cuando quieras que Google lo indexe)
Borra el `<meta name="robots">` de `index.html` y el header `X-Robots-Tag` de `vercel.json` → push.

## Checklist post-deploy
- [ ] La URL abre el menú y el nivel 1 se juega con el dedo en el celular.
- [ ] Android: "Instalar app" · iPhone: Compartir → Agregar a inicio → abre a pantalla completa.
- [ ] Modo avión con la app instalada: sigue abriendo.
- [ ] `/og.png` abre y el link se ve con tarjeta grande en WhatsApp.

## Estructura
| Archivo | Qué es |
|---|---|
| `index.html` | Pantallas (menú, niveles, arsenal, ajustes, briefing, resultado) y estilos |
| `game.js` | Motor: generador de los 100 niveles, IA de guardias, render, tienda, guardado |
| `sw.js` · `manifest.webmanifest` | PWA instalable y offline |
| `icon-*.png` · `apple-touch-icon.png` · `og.png` | Íconos y tarjeta para compartir |
| `vercel.json` | Headers (noindex, caché del service worker) |

## Ajustar dificultad
En `game.js`: `params(L)` (velocidad de detección, alcance de visión, cadencia de disparo), `missionFor(L)` (tipo de misión por nivel) y en `tryGen` el número de guardias (`nG`) y desde qué nivel aparece cada enemigo (`pickType`). Los niveles son deterministas: el nivel 37 siempre es el mismo mapa para todos.
