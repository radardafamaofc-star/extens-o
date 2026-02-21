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
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'verifyCode') {
    chrome.storage.local.get(['backendUrl'], (result) => {
      const url = result.backendUrl || BACKEND_URL;
      fetch(url + '/api/extension/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: request.code })
      })
      .then(res => res.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ valid: false, error: err.toString() }));
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
      .then(res => res.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.toString() }));
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
let isProcessing = false;

function injectButton() {
  chrome.storage.local.get(['activationCode'], (result) => {
    // Apenas aparece se a extensão estiver ativa
    if (!result.activationCode) return;
    
    const selectors = [
      'textarea',
      '[contenteditable="true"]',
      '.ProseMirror',
      '#prompt-textarea',
      '[data-testid="prompt-input"]',
      'div[role="textbox"]'
    ];
    
    let targetTextarea = null;
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Pega o último elemento encontrado (geralmente o campo de chat ativo)
        targetTextarea = elements[elements.length - 1];
        break;
      }
    }

    if (!targetTextarea) return;
    
    const container = targetTextarea.closest('div') || targetTextarea.parentElement;
    if (!container || container.querySelector('.lovable-improver-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'lovable-improver-btn';
    btn.innerHTML = '<span>✨</span> Melhorar';
    btn.type = 'button';
    btn.title = 'Transformar em prompt profissional';
    
    // Estilo elegante e não intrusivo para o Lovable
    btn.style.cssText = 'position: absolute; bottom: 12px; right: 45px; background: #0f172a; color: white; border: 1px solid #334155; padding: 6px 12px; border-radius: 8px; cursor: pointer; z-index: 9999; font-size: 12px; font-weight: 600; font-family: sans-serif; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);';
    
    btn.onmouseover = () => {
      btn.style.background = '#1e293b';
      btn.style.transform = 'translateY(-1px)';
    };
    btn.onmouseout = () => {
      btn.style.background = '#0f172a';
      btn.style.transform = 'translateY(0)';
    };

    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isProcessing) return;

      const currentPrompt = (targetTextarea.value || targetTextarea.innerText || "").trim();
      if (!currentPrompt) return;

      isProcessing = true;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<span>⏳</span>...';
      btn.style.opacity = '0.7';
      btn.disabled = true;

      chrome.runtime.sendMessage({ action: 'improvePrompt', prompt: currentPrompt }, (response) => {
        btn.innerHTML = originalHtml;
        btn.style.opacity = '1';
        btn.disabled = false;
        isProcessing = false;
        
        if (response && response.improvedPrompt) {
          const newValue = response.improvedPrompt;
          
          if (targetTextarea.tagName === 'TEXTAREA' || targetTextarea.tagName === 'INPUT') {
            targetTextarea.value = newValue;
          } else {
            targetTextarea.innerText = newValue;
          }
          
          // Dispara evento de input para o React/Vue do Lovable detectar a mudança
          // SEM disparar Enter ou auto-envio
          targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (response && response.error) {
          console.error('Lovable Improver Error:', response.error);
          btn.innerHTML = '<span>❌</span> Erro';
          setTimeout(() => btn.innerHTML = originalHtml, 3000);
        }
      });
    });

    container.appendChild(btn);
  });
}

// Observer com debounce para não pesar no site e evitar loops
let debounceTimer;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(injectButton, 500);
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(injectButton, 2000);
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
