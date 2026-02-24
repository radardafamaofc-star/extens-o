import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import archiver from "archiver";
import OpenAI from "openai";

// Initialize OpenAI with Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);

  // Admin routes for activation codes
  app.get(api.codes.list.path, isAuthenticated, async (req, res) => {
    try {
      const codes = await storage.getCodes();
      res.json(codes);
    } catch (e) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.codes.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.codes.create.input.parse(req.body);
      const codeStr = crypto.randomBytes(8).toString('hex').toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.daysValid);
      
      const userId = (req.user as any).claims.sub;
      
      const newCode = await storage.createCode(codeStr, expiresAt, userId);
      res.status(201).json(newCode);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.codes.revoke.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      
      const code = await storage.getCodeById(id);
      if (!code) return res.status(404).json({ message: "Code not found" });
      
      const updated = await storage.revokeCode(id);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dynamic extension download endpoint
  app.get('/api/extension/download', isAuthenticated, (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const hostUrl = `${protocol}://${req.get('host')}`;
    
    res.attachment('lovable-improver-extension.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Manifest
    archive.append(JSON.stringify({
      "manifest_version": 3,
      "name": "Lovable Prompt Improver",
      "version": "1.0",
      "description": "Melhora prompts no Lovable usando IA",
      "permissions": ["storage", "activeTab", "scripting"],
      "host_permissions": ["*://*.lovable.dev/*", "*://*.lovable.app/*", `${hostUrl}/*`],
      "action": {
        "default_popup": "popup.html"
      },
      "content_scripts": [
        {
          "matches": ["*://*.lovable.dev/*", "*://*.lovable.app/*"],
          "js": ["content.js"],
          "run_at": "document_idle"
        }
      ],
      "background": {
        "service_worker": "background.js"
      }
    }, null, 2), { name: 'manifest.json' });

    // background.js
    const bgJs = `
const BACKEND_URL = "${hostUrl}";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ backendUrl: BACKEND_URL });
  console.log('Lovable Improver: Instalada com URL:', BACKEND_URL);
});

// Escuta mudanças no storage para logar ativação
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.activationCode) {
    console.log('Lovable Improver: Código de ativação alterado:', changes.activationCode.newValue ? 'Ativado' : 'Removido');
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'verifyCode') {
    chrome.storage.local.get(['backendUrl'], (result) => {
      const url = result.backendUrl || BACKEND_URL;
      console.log('Lovable Improver: Verificando código em:', url);
      
      fetch(url + '/api/extension/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: request.code })
      })
      .then(res => {
        if (!res.ok) throw new Error('Servidor retornou ' + res.status);
        return res.json();
      })
      .then(data => {
        console.log('Lovable Improver: Resposta de verificação:', data);
        sendResponse(data);
      })
      .catch(err => {
        console.error('Lovable Improver: Erro na verificação:', err);
        sendResponse({ valid: false, error: err.toString() });
      });
    });
    return true;
  }
  
  if (request.action === 'improvePrompt') {
    chrome.storage.local.get(['activationCode', 'backendUrl'], (result) => {
      if (!result.activationCode) {
        sendResponse({ error: 'Nenhum código de ativação configurado.' });
        return;
      }
      const url = result.backendUrl || BACKEND_URL;
      
      fetch(url + '/api/extension/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: result.activationCode,
          prompt: request.prompt
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('Erro na API: ' + res.status);
        return res.json();
      })
      .then(data => sendResponse(data))
      .catch(err => {
        console.error('Lovable Improver: Erro ao melhorar prompt:', err);
        sendResponse({ error: err.toString() });
      });
    });
    return true;
  }
});
    `;
    archive.append(bgJs, { name: 'background.js' });

    // popup.html - Using string concatenation to avoid nested template literal issues
    const popupHtml = '<!DOCTYPE html>\n' +
'<html>\n' +
'<head>\n' +
'  <meta charset="utf-8">\n' +
'  <style>\n' +
'    body { font-family: sans-serif; padding: 15px; width: 250px; background: #f9fafb; margin: 0; }\n' +
'    h3 { margin-top: 0; font-size: 16px; color: #111827; }\n' +
'    input { width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 6px; }\n' +
'    button { width: 100%; padding: 8px; background: #000; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }\n' +
'    button:hover { background: #374151; }\n' +
'    .status { margin-top: 10px; font-size: 12px; color: #6b7280; text-align: center; }\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <h3>Prompt Improver</h3>\n' +
'  <div id="setup">\n' +
'    <input type="text" id="activationCode" placeholder="Código de ativação">\n' +
'    <button id="saveBtn">Ativar Extensão</button>\n' +
'  </div>\n' +
'  <div id="status" class="status">Insira seu código gerado no painel.</div>\n' +
'  <script src="popup.js"></script>\n' +
'</body>\n' +
'</html>';
    archive.append(popupHtml, { name: 'popup.html' });

    // popup.js
    const popupJs = `
document.addEventListener('DOMContentLoaded', () => {
  const codeInput = document.getElementById('activationCode');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  chrome.storage.local.get(['activationCode'], (result) => {
    if (result.activationCode) {
      codeInput.value = result.activationCode;
      verifyAndShowStatus(result.activationCode);
    }
  });

  saveBtn.addEventListener('click', () => {
    const code = codeInput.value.trim();
    if (!code) return;
    statusDiv.textContent = 'Verificando...';
    statusDiv.style.color = '#6b7280';
    verifyAndShowStatus(code);
  });

  function verifyAndShowStatus(code) {
    chrome.runtime.sendMessage({ action: 'verifyCode', code }, (response) => {
      if (response && response.valid) {
        chrome.storage.local.set({ activationCode: code }, () => {
          statusDiv.textContent = 'Ativado! Válido até ' + new Date(response.expiresAt).toLocaleDateString();
          statusDiv.style.color = '#059669';
        });
      } else {
        chrome.storage.local.remove(['activationCode']);
        statusDiv.textContent = 'Código inválido ou expirado.';
        statusDiv.style.color = '#dc2626';
      }
    });
  }
});`;
    archive.append(popupJs, { name: 'popup.js' });

    // content.js
    const contentJs = `
function injectButton() {
  // Seletores para o campo de prompt do Lovable
  const selectors = [
    'textarea',
    '[contenteditable="true"]',
    '.ProseMirror',
    '#prompt-textarea',
    '[data-testid="prompt-input"]',
    'div[role="textbox"]'
  ];
  
  let target = null;
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      target = elements[elements.length - 1];
      break;
    }
  }

  if (!target) return;
  
  // O container deve ser o elemento que contém o input e outros botões (como o de anexo)
  // No Lovable, geralmente é um div que envolve o contenteditable e os ícones da barra inferior
  let container = target.closest('div[class*="relative"]'); 
  if (!container) container = target.parentElement;
  
  // CRITICAL: Evita injeção múltipla e loop infinito
  if (container.querySelector('.lovable-improver-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'lovable-improver-btn';
  // Garante que o botão não seja tratado como parte do texto pelo Lovable
  btn.setAttribute('contenteditable', 'false');
  btn.innerHTML = '✨';
  btn.type = 'button';
  btn.title = 'Melhorar Prompt Profissional';
  
  // Estilo de ícone flutuante discreto, fixo no canto
  btn.style.cssText = 'position: absolute !important; bottom: 8px !important; right: 50px !important; background: #0f172a !important; color: white !important; border: 1px solid #3b82f6 !important; width: 28px !important; height: 28px !important; border-radius: 50% !important; cursor: pointer !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 14px !important; transition: all 0.2s ease !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important; user-select: none !important; margin: 0 !important; padding: 0 !important; line-height: 1 !important;';
  
  btn.onmouseover = () => {
    btn.style.background = '#1e293b';
    btn.style.transform = 'scale(1.1)';
  };
  btn.onmouseout = () => {
    btn.style.background = '#0f172a';
    btn.style.transform = 'scale(1)';
  };

  // Garante que o container permite posicionamento absoluto
  const containerStyle = window.getComputedStyle(container);
  if (containerStyle.position === 'static') {
    container.style.position = 'relative';
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    chrome.storage.local.get(['activationCode'], (result) => {
      if (!result.activationCode) {
        alert('Ative a extensão com seu código primeiro!');
        return;
      }

      const currentPrompt = (target.value || target.innerText || "").trim();
      if (!currentPrompt || currentPrompt.length < 2) return;

      const originalHtml = btn.innerHTML;
      btn.innerHTML = '⏳';
      btn.disabled = true;

      chrome.runtime.sendMessage({ action: 'improvePrompt', prompt: currentPrompt }, (response) => {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        
        if (response && response.improvedPrompt) {
          const improved = response.improvedPrompt;
          
          if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
            target.value = improved;
          } else {
            // Para contenteditable, precisamos ser cuidadosos para não disparar eventos de teclado indesejados
            target.innerHTML = '';
            const textNode = document.createTextNode(improved);
            target.appendChild(textNode);
          }
          
          // Notifica o sistema do Lovable que o conteúdo mudou
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Foca de volta no campo
          target.focus();
          
          // Posiciona o cursor no final
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(target);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          alert('Erro: ' + (response?.error || 'Verifique sua conexão'));
        }
      });
    });
  });

  // Insere no container como filho direto, garantindo que não entre no nó de texto
  container.appendChild(btn);
}

// Injeção periódica segura para lidar com mudanças dinâmicas
setInterval(() => {
  if (!document.querySelector('.lovable-improver-btn')) {
    injectButton();
  }
}, 2000);

injectButton();
    `;
    archive.append(contentJs, { name: 'content.js' });

    archive.finalize();
  });

  // Extension API routes (No authentication middleware, uses code verification)
  app.post(api.extension.verify.path, async (req, res) => {
    try {
      const { code } = api.extension.verify.input.parse(req.body);
      const activationCode = await storage.getCodeByValue(code);
      
      if (!activationCode || !activationCode.isActive) {
        return res.json({ valid: false, expiresAt: "" });
      }
      
      if (new Date() > activationCode.expiresAt) {
        await storage.revokeCode(activationCode.id);
        return res.json({ valid: false, expiresAt: "" });
      }
      
      res.json({ valid: true, expiresAt: activationCode.expiresAt.toISOString() });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.extension.improve.path, async (req, res) => {
    try {
      const { code, prompt } = api.extension.improve.input.parse(req.body);
      
      const activationCode = await storage.getCodeByValue(code);
      if (!activationCode || !activationCode.isActive || new Date() > activationCode.expiresAt) {
        return res.status(401).json({ message: "Invalid or expired activation code" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um Engenheiro de Prompt de Elite. Sua missão é transformar prompts amadores em especificações técnicas de alto nível para IAs como Lovable ou Cursor.

REGRAS DE OURO:
1. ARQUITETURA: Especifique tecnologias (React, Tailwind, Lucide Icons, Shadcn).
2. UI/UX: Descreva um design moderno, limpo e profissional.
3. DETALHAMENTO: Adicione estados de erro, loading e responsividade que o usuário esqueceu.
4. FORMATO: Divida em seções (Visão Geral, Funcionalidades Técnicas, Design).
5. SILÊNCIO: Responda APENAS com o prompt melhorado, sem introduções.`
          },
          {
            role: "user",
            content: `Transforme este prompt em algo 100% profissional: \n\n${prompt}`
          }
        ],
        temperature: 0.3,
      });

      const improvedPrompt = response.choices[0].message.content?.trim() || prompt;
      return res.json({ improvedPrompt });
    } catch (err) {
      console.error("OpenAI error:", err);
      res.status(500).json({ error: "Failed to improve prompt. Check AI configuration." });
    }
  });

  return httpServer;
}
