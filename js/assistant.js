// js/assistant.js

(function () {
    let attachedFile = null;
    let chatHistory = [];
  
    const messagesEl = document.getElementById("chat-messages");
    const inputEl = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send");
    const fileInput = document.getElementById("file-upload");
    const fileNameEl = document.getElementById("file-name");
  
    if (!messagesEl || !inputEl || !sendBtn || !fileInput) return;
  
    fileInput.addEventListener("change", function () {
      const file = fileInput.files[0];
      if (!file) return;
      attachedFile = file;
      fileNameEl.textContent = "📄 " + file.name;
    });
  
    sendBtn.addEventListener("click", enviar);
  
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") enviar();
    });
  
    async function enviar() {
      const texto = inputEl.value.trim();
      if (!texto && !attachedFile) return;
  
      const userMsg = texto || ("Archivo adjunto: " + attachedFile.name);
      appendMessage("user", userMsg);
      inputEl.value = "";
  
      const loadingId = appendMessage("assistant", "⏳ Analizando...");
  
      try {
        let content = [];
  
        if (attachedFile) {
          const base64 = await toBase64(attachedFile);
          const type = attachedFile.type;
  
          if (type === "application/pdf") {
            content.push({ type: "document", source: { type: "base64", media_type: type, data: base64 } });
          } else if (type.startsWith("image/")) {
            content.push({ type: "image", source: { type: "base64", media_type: type, data: base64 } });
          } else {
            const textData = await attachedFile.text();
            content.push({ type: "text", text: "Contenido del archivo (" + attachedFile.name + "):\n" + textData.slice(0, 8000) });
          }
  
          attachedFile = null;
          fileNameEl.textContent = "";
          fileInput.value = "";
        }
  
        if (texto) content.push({ type: "text", text: texto });
  
        chatHistory.push({ role: "user", content: content });
  
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            system: "Eres un asistente especializado en econometría y Stata. Ayudas a estudiantes universitarios de Ecuador con regresiones, interpretación de resultados, comandos Stata, series de tiempo y modelos econométricos. Responde siempre en español, de forma clara y didáctica.",
            messages: chatHistory,
          }),
        });
  
        const data = await response.json();
        const reply = data.content?.find(b => b.type === "text")?.text || "Sin respuesta.";
  
        chatHistory.push({ role: "assistant", content: reply });
        updateMessage(loadingId, reply);
      } catch (err) {
        updateMessage(loadingId, "❌ Error al conectar con la IA. Intenta de nuevo.");
        console.error(err);
      }
    }
  
    function appendMessage(role, text) {
      const id = "msg-" + Date.now();
      const div = document.createElement("div");
      div.className = "chat-msg chat-msg--" + role;
      div.id = id;
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return id;
    }
  
    function updateMessage(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  
    function toBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  })();