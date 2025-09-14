(async function(){
    // Elementos del DOM
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const markBtn = document.getElementById('markBtn');
    const preview = document.getElementById('preview');
    const downloadLink = document.getElementById('downloadLink');
    const status = document.getElementById('status');
    const statusIndicator = document.getElementById('statusIndicator');
    const timerEl = document.getElementById('timer');
    const fileSizeEl = document.getElementById('fileSize');
    const fileInfoEl = document.getElementById('fileInfo');
    const markersList = document.getElementById('markersList');
    const markersSection = document.getElementById('markersSection');
    
    // Elementos del historial
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    
    // Configuraciones
    const withCamChk = document.getElementById('withCam');
    const withMicChk = document.getElementById('withMic');
    const systemAudioChk = document.getElementById('systemAudio');
    const cursorHighlightChk = document.getElementById('cursorHighlight');
    const qualitySelect = document.getElementById('qualitySelect');
    const fpsSelect = document.getElementById('fpsSelect');
    const formatSelect = document.getElementById('formatSelect');
    const audioQualitySelect = document.getElementById('audioQuality');
  
    // Variables de estado
    let mediaRecorder, recordedChunks = [];
    let displayStream, camStream, micStream;
    let canvas, canvasStream, audioCtx, mixedAudioDest;
    let timerInterval, startTime, pausedTime = 0;
    let markers = [];
    let currentFileSize = 0;
    let recordingState = 'idle'; // idle, recording, paused, stopped
  
    // Funciones de utilidad
    function formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // IndexedDB helpers para blobs grandes
    let idbInstance;
    function openDB() {
      return new Promise((resolve, reject) => {
        if (idbInstance) return resolve(idbInstance);
        const request = indexedDB.open('screenrec-db', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('videos')) {
            db.createObjectStore('videos');
          }
        };
        request.onsuccess = () => { idbInstance = request.result; resolve(idbInstance); };
        request.onerror = () => reject(request.error);
      });
    }

    async function idbSetBlob(key, blob) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite');
        tx.objectStore('videos').put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    async function idbGetBlob(key) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readonly');
        const req = tx.objectStore('videos').get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    }

    async function idbDeleteBlob(key) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite');
        tx.objectStore('videos').delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    // Funciones del historial (metadatos en localStorage, blobs en IndexedDB)
    async function saveToHistory(blob, metadata) {
      const history = getHistory();
      const historyItem = {
        id: Date.now().toString(),
        metadata: metadata,
        timestamp: new Date().toISOString()
      };

      // Guardar blob en IndexedDB y metadatos en localStorage
      await idbSetBlob(historyItem.id, blob);

      history.unshift(historyItem); // Agregar al inicio

      // Limitar a 50 entradas de historial (solo metadatos)
      if (history.length > 50) {
        const removed = history.splice(50);
        // Borrar blobs de los eliminados
        removed.forEach(item => idbDeleteBlob(item.id).catch(()=>{}));
      }

      localStorage.setItem('screenRecHistory', JSON.stringify(history));

      updateHistoryDisplay();
    }

    function getHistory() {
      try {
        const stored = localStorage.getItem('screenRecHistory');
        if (!stored) return [];
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Error loading history:', e);
        return [];
      }
    }

    function updateHistoryDisplay() {
      const history = getHistory();
      
      if (history.length === 0) {
        historyList.innerHTML = `
          <div class="history-empty">
            <p>No hay grabaciones en el historial</p>
            <small>Las grabaciones se guardarán automáticamente aquí</small>
          </div>
        `;
        return;
      }
      
      historyList.innerHTML = history.map(item => `
        <div class="history-item">
          <div class="history-item-header">
            <h4 class="history-item-title">${item.metadata.filename}</h4>
            <span class="history-item-date">${new Date(item.timestamp).toLocaleString()}</span>
          </div>
          
          <div class="history-item-meta">
            <div class="history-meta-item">
              <span class="history-meta-label">Duración</span>
              <span class="history-meta-value">${formatTime(item.metadata.duration)}</span>
            </div>
            <div class="history-meta-item">
              <span class="history-meta-label">Tamaño</span>
              <span class="history-meta-value">${formatFileSize(item.metadata.size)}</span>
            </div>
            <div class="history-meta-item">
              <span class="history-meta-label">Formato</span>
              <span class="history-meta-value">${item.metadata.format.toUpperCase()}</span>
            </div>
            <div class="history-meta-item">
              <span class="history-meta-label">Marcadores</span>
              <span class="history-meta-value">${item.metadata.markers || 0}</span>
            </div>
          </div>
          
          <div class="history-item-actions">
            <button class="history-action-btn play" onclick="playFromHistory('${item.id}')">
              ▶️ Reproducir
            </button>
            <button class="history-action-btn download" onclick="downloadFromHistory('${item.id}')">
              📥 Descargar
            </button>
            <button class="history-action-btn delete" onclick="deleteFromHistory('${item.id}')">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      `).join('');
    }

    async function playFromHistory(id) {
      const history = getHistory();
      const item = history.find(h => h.id === id);
      if (item) {
        const blob = await idbGetBlob(id);
        if (!blob) {
          updateStatus('⚠️ No se encontró el video en el almacenamiento. Puede haberse limpiado.', 'idle');
          return;
        }
        const url = URL.createObjectURL(blob);
        preview.src = url;
        preview.controls = true;
        preview.play().catch(() => {});
        updateStatus('🎬 Reproduciendo grabación del historial', 'idle');
      }
    }

    async function downloadFromHistory(id) {
      const history = getHistory();
      const item = history.find(h => h.id === id);
      if (item) {
        const blob = await idbGetBlob(id);
        if (!blob) {
          updateStatus('⚠️ No se encontró el video en el almacenamiento. Puede haberse limpiado.', 'idle');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.metadata.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        updateStatus('📥 Descarga iniciada', 'idle');
      }
    }

    async function deleteFromHistory(id) {
      if (confirm('¿Estás seguro de que quieres eliminar esta grabación?')) {
        const history = getHistory();
        const filteredHistory = history.filter(h => h.id !== id);
        localStorage.setItem('screenRecHistory', JSON.stringify(filteredHistory));
        await idbDeleteBlob(id).catch(()=>{});
        
        updateHistoryDisplay();
        updateStatus('🗑️ Grabación eliminada del historial', 'idle');
      }
    }

    async function clearHistory() {
      if (confirm('¿Estás seguro de que quieres eliminar todo el historial?')) {
        localStorage.removeItem('screenRecHistory');
        // Borrar todos los blobs
        try {
          const db = await openDB();
          const tx = db.transaction('videos', 'readwrite');
          tx.objectStore('videos').clear();
        } catch (_) {}
        updateHistoryDisplay();
        updateStatus('🗑️ Historial limpiado', 'idle');
      }
    }

    // Hacer funciones globales
    window.playFromHistory = playFromHistory;
    window.downloadFromHistory = downloadFromHistory;
    window.deleteFromHistory = deleteFromHistory;
  
    function updateTimer(){
      if(!startTime) {
        timerEl.textContent = '00:00:00';
        fileSizeEl.textContent = 'Tamaño: 0 MB';
        return;
      }
      
      const totalSeconds = Math.floor((Date.now() - startTime - pausedTime) / 1000);
      timerEl.textContent = formatTime(totalSeconds);
      
      // Actualizar tamaño estimado del archivo
      const estimatedSize = (totalSeconds * 0.5); // Estimación aproximada en MB
      fileSizeEl.textContent = `Tamaño estimado: ${estimatedSize.toFixed(1)} MB`;
    }
  
    function updateStatus(message, state = 'idle') {
      status.textContent = message;
      recordingState = state;
      
      // Actualizar indicador visual
      statusIndicator.className = 'status-indicator';
      if (state === 'recording') {
        statusIndicator.classList.add('recording');
      } else if (state === 'paused') {
        statusIndicator.classList.add('paused');
      }
    }
  
    function updateButtonStates() {
      const isRecording = recordingState === 'recording';
      const isPaused = recordingState === 'paused';
      const isIdle = recordingState === 'idle';
      
      startBtn.disabled = !isIdle;
      pauseBtn.disabled = !isRecording;
      resumeBtn.disabled = !isPaused;
      stopBtn.disabled = isIdle;
      markBtn.disabled = isIdle;
    }
  
    function addMarker() {
      if (!startTime) return;
      
      const currentTime = Math.floor((Date.now() - startTime - pausedTime) / 1000);
      const marker = {
        time: currentTime,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now()
      };
      
      markers.push(marker);
      updateMarkersDisplay();
    }
  
    function updateMarkersDisplay() {
      if (markers.length === 0) {
        markersSection.classList.add('hidden');
        return;
      }
      
      markersSection.classList.remove('hidden');
      markersList.innerHTML = markers.map(marker => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border-radius: 6px; margin: 5px 0; border-left: 4px solid #1f6feb;">
          <span><strong>${formatTime(marker.time)}</strong> - ${marker.timestamp}</span>
          <button onclick="removeMarker(${marker.id})" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
        </div>
      `).join('');
    }
  
    function removeMarker(id) {
      markers = markers.filter(m => m.id !== id);
      updateMarkersDisplay();
    }
  
    // Configuraciones de grabación
    function getRecordingConfig() {
      const quality = qualitySelect.value;
      const fps = parseInt(fpsSelect.value);
      const format = formatSelect.value;
      
      let videoConfig = { frameRate: fps };
      
      switch (quality) {
        case 'high':
          videoConfig.width = 1920;
          videoConfig.height = 1080;
          break;
        case 'medium':
          videoConfig.width = 1280;
          videoConfig.height = 720;
          break;
        case 'low':
          videoConfig.width = 854;
          videoConfig.height = 480;
          break;
      }
      
      return { videoConfig, format, fps };
    }
  
    async function startRecording(){
      try{
        // Reset completo de variables
        recordedChunks = [];
        markers = [];
        pausedTime = 0;
        currentFileSize = 0;
        
        // Limpiar cualquier grabación anterior
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          console.log('Deteniendo grabación anterior antes de iniciar nueva');
          mediaRecorder.stop();
        }
        
        // Limpiar streams anteriores
        cleanupStreams();
        
        updateStatus('Solicitando permiso para compartir pantalla...', 'idle');
        updateButtonStates();
  
        const { videoConfig, format, fps } = getRecordingConfig();
        
        // Configurar audio del sistema
        const includeSystemAudio = systemAudioChk.checked;
        const includeMic = withMicChk.checked;
        
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: videoConfig, 
          audio: includeSystemAudio
        });
  
        if(withCamChk.checked){
          camStream = await navigator.mediaDevices.getUserMedia({
            video: {width: 320, height: 240}, 
            audio: false
          });
        }
        
        if(includeMic){
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }, 
            video: false
          });
        }
  
        // Crear canvas para composición de video
        const displayTrackSettings = displayStream.getVideoTracks()[0].getSettings();
        const w = displayTrackSettings.width || 1280;
        const h = displayTrackSettings.height || 720;
  
        canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
  
        const displayVideo = document.createElement('video');
        displayVideo.srcObject = displayStream;
        displayVideo.play().catch(()=>{});
        
        let camVideo;
        if(camStream){
          camVideo = document.createElement('video');
          camVideo.srcObject = camStream;
          camVideo.play().catch(()=>{});
        }
  
        // Configurar mezcla de audio
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mixedAudioDest = audioCtx.createMediaStreamDestination();
  
        // Conectar audio del sistema si está disponible
        try{
          const displayAudioTracks = displayStream.getAudioTracks();
          if(displayAudioTracks.length){
            const ds = new MediaStream(displayAudioTracks);
            const src = audioCtx.createMediaStreamSource(ds);
            src.connect(mixedAudioDest);
          }
        }catch(e){/*ignore*/}
  
        // Conectar micrófono si está habilitado
        if(micStream){
          const micSrc = audioCtx.createMediaStreamSource(micStream);
          micSrc.connect(mixedAudioDest);
        }
  
        // Capturar canvas como stream de video
        canvasStream = canvas.captureStream(fps);
  
        // Adjuntar pista de audio mezclada
        const mixedTracks = mixedAudioDest.stream.getAudioTracks();
        if(mixedTracks.length){
          canvasStream.addTrack(mixedTracks[0]);
        }
  
        // Configurar MediaRecorder con opciones optimizadas
        let mimeType, options;
        
        if (format === 'mp4') {
          mimeType = 'video/mp4';
          options = { 
            mimeType,
            videoBitsPerSecond: 2500000 // 2.5 Mbps para mejor calidad
          };
        } else {
          mimeType = 'video/webm;codecs=vp9,opus';
          options = { 
            mimeType,
            videoBitsPerSecond: 2500000,
            audioBitsPerSecond: 128000
          };
        }
        
        // Verificar soporte del navegador con fallbacks
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.warn('Tipo MIME no soportado:', options.mimeType);
          
          if (format === 'mp4') {
            // Fallback para MP4
            const fallbacks = [
              'video/webm;codecs=vp9,opus',
              'video/webm;codecs=vp8,opus',
              'video/webm'
            ];
            
            for (const fallback of fallbacks) {
              if (MediaRecorder.isTypeSupported(fallback)) {
                options.mimeType = fallback;
                console.log('Usando fallback:', fallback);
                break;
              }
            }
          } else {
            // Fallback para WebM
            const fallbacks = [
              'video/webm;codecs=vp8,opus',
              'video/webm'
            ];
            
            for (const fallback of fallbacks) {
              if (MediaRecorder.isTypeSupported(fallback)) {
                options.mimeType = fallback;
                console.log('Usando fallback:', fallback);
                break;
              }
            }
          }
        }
        
        console.log('Configuración final del MediaRecorder:', options);
        
        mediaRecorder = new MediaRecorder(canvasStream, options);
  
        mediaRecorder.ondataavailable = e => { 
          console.log('Chunk recibido:', e.data.size, 'bytes');
          if(e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
            currentFileSize += e.data.size;
            console.log('Total chunks:', recordedChunks.length, 'Tamaño total:', currentFileSize);
          }
        };
        mediaRecorder.onstop = onStop;
        
        // Agregar eventos de error para debugging
        mediaRecorder.onerror = (e) => {
          console.error('Error en MediaRecorder:', e);
          updateStatus('❌ Error durante la grabación', 'idle');
        };
        
        mediaRecorder.onwarning = (e) => {
          console.warn('Advertencia en MediaRecorder:', e);
        };
  
        // Usar un intervalo más frecuente para capturar mejor los datos
        mediaRecorder.start(500); // Cada 500ms en lugar de 1000ms
        updateStatus('🎥 Grabando...', 'recording');
  
        // Bucle de dibujo mejorado
        function drawLoop(){
          try{
            ctx.clearRect(0,0,canvas.width,canvas.height);
            
            // Dibujar pantalla principal
            if(displayVideo.readyState >= 2) {
              ctx.drawImage(displayVideo,0,0,canvas.width,canvas.height);
            }
            
            // Dibujar overlay de cámara
            if(camVideo && camVideo.readyState >= 2){
              const cw = Math.floor(canvas.width*0.22);
              const ch = Math.floor(cw * (camVideo.videoHeight/camVideo.videoWidth || (3/4)));
              const px = canvas.width - cw - 16;
              const py = canvas.height - ch - 16;
              
              // Fondo redondeado con sombra
              ctx.fillStyle = 'rgba(0,0,0,0.4)';
              roundRect(ctx, px-8, py-8, cw+16, ch+16, 16, true, false);
              
              // Borde
              ctx.strokeStyle = 'rgba(255,255,255,0.3)';
              ctx.lineWidth = 2;
              roundRect(ctx, px-8, py-8, cw+16, ch+16, 16, false, true);
              
              // Video de cámara
              ctx.drawImage(camVideo, px, py, cw, ch);
            }
            
            // Resaltar cursor si está habilitado
            if(cursorHighlightChk.checked) {
              // Esta funcionalidad requeriría captura adicional del cursor
              // Por ahora, solo mostramos un indicador visual
            }
            
          }catch(err){
            console.warn('Error en drawLoop:', err);
          }
          requestAnimationFrame(drawLoop);
        }
        drawLoop();
  
        // Preview del stream compuesto
        preview.srcObject = canvasStream;
        preview.controls = false; // Deshabilitar controles durante la grabación
        preview.muted = true; // Evitar feedback
        preview.play().catch(()=>{});
  
        // Iniciar temporizador
        startTime = Date.now();
        updateTimer();
        timerInterval = setInterval(updateTimer, 500);
        updateButtonStates();
  
      }catch(err){
        console.error('Error al iniciar grabación:', err);
        updateStatus(`❌ Error: ${err.message || err.name}`, 'idle');
        cleanupStreams();
        updateButtonStates();
      }
    }
  
    function roundRect(ctx, x, y, w, h, r, fill, stroke){
      if (typeof r === 'undefined') r = 5;
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.arcTo(x+w, y,   x+w, y+h, r);
      ctx.arcTo(x+w, y+h, x,   y+h, r);
      ctx.arcTo(x,   y+h, x,   y,   r);
      ctx.arcTo(x,   y,   x+w, y,   r);
      ctx.closePath();
      if(fill) ctx.fill();
      if(stroke) ctx.stroke();
    }

    // Función para verificar la integridad del video
    async function verifyVideoIntegrity(blob, url) {
      return new Promise((resolve) => {
        try {
          const testVideo = document.createElement('video');
          testVideo.preload = 'metadata';
          
          testVideo.onloadedmetadata = () => {
            console.log('Video metadata cargado. Duración:', testVideo.duration);
            const isValid = testVideo.duration > 0 && !isNaN(testVideo.duration);
            resolve(isValid);
          };
          
          testVideo.onerror = (e) => {
            console.error('Error al cargar video para verificación:', e);
            resolve(false);
          };
          
          // Timeout para evitar que se quede colgado
          setTimeout(() => {
            console.warn('Timeout en verificación de video');
            resolve(false);
          }, 5000);
          
          testVideo.src = url;
          
        } catch (error) {
          console.error('Error en verificación de integridad:', error);
          resolve(false);
        }
      });
    }
  
    async function onStop(){
      console.log('onStop llamado. Total chunks:', recordedChunks.length);
      console.log('Tamaño total acumulado:', currentFileSize);
      
      const format = formatSelect.value;
      const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
      const fileExtension = format === 'mp4' ? 'mp4' : 'webm';
      
      // Validar que tenemos chunks válidos
      if (recordedChunks.length === 0) {
        console.error('No hay chunks de video grabados');
        updateStatus('❌ Error: No se capturaron datos de video', 'idle');
        return;
      }
      
      // Filtrar chunks vacíos o corruptos
      const validChunks = recordedChunks.filter(chunk => chunk && chunk.size > 0);
      console.log('Chunks válidos:', validChunks.length);
      
      if (validChunks.length === 0) {
        console.error('No hay chunks válidos de video');
        updateStatus('❌ Error: No se encontraron datos válidos de video', 'idle');
        return;
      }
      
      const blob = new Blob(validChunks, {type: mimeType});
      console.log('Blob creado. Tamaño:', blob.size, 'bytes');
      
      // Verificar que el blob tiene un tamaño razonable
      if (blob.size < 1000) { // Menos de 1KB es sospechoso
        console.warn('Blob muy pequeño, posible problema de grabación');
        updateStatus('⚠️ Advertencia: Video muy pequeño, posible problema', 'idle');
      }
      
      const url = URL.createObjectURL(blob);
      
      // Configurar descarga
      const timestamp = new Date().toISOString().replace(/[:.]/g,'-').slice(0, -5);
      downloadLink.href = url;
      downloadLink.download = `ScreenRec_${timestamp}.${fileExtension}`;
      downloadLink.classList.remove('hidden');
      downloadLink.textContent = `📥 Descargar video (${fileExtension.toUpperCase()})`;
      
      // Mostrar información del archivo
      const fileSize = formatFileSize(blob.size);
      const duration = Math.floor((Date.now() - startTime - pausedTime) / 1000);
      fileInfoEl.innerHTML = `
        <strong>Archivo generado:</strong><br>
        Tamaño: ${fileSize}<br>
        Duración: ${formatTime(duration)}<br>
        Marcadores: ${markers.length}
      `;
      fileInfoEl.classList.remove('hidden');
      
      // Verificar integridad del video
      try {
        const isValid = await verifyVideoIntegrity(blob, url);
        if (!isValid) {
          console.warn('Video puede tener problemas de integridad');
          updateStatus('⚠️ Video guardado pero puede tener problemas', 'idle');
        }
      } catch (error) {
        console.error('Error en verificación de integridad:', error);
      }

      // Guardar en historial
      const metadata = {
        filename: `ScreenRec_${timestamp}.${fileExtension}`,
        duration: duration,
        size: blob.size,
        format: fileExtension,
        mimeType: mimeType,
        markers: markers.length,
        quality: qualitySelect.value,
        fps: parseInt(fpsSelect.value)
      };
      saveToHistory(blob, metadata);

      // Configurar preview del video final
      preview.srcObject = null;
      preview.src = url;
      preview.controls = true; // Solo habilitar controles para el video final
      preview.play().catch(()=>{});

      updateStatus('✅ Grabación completada y guardada en historial.', 'idle');
      clearInterval(timerInterval);
      startTime = null;
      pausedTime = 0;
      updateTimer();
      updateButtonStates();

      // Limpiar contexto de audio
      if(audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(()=>{});
      }
    }
  
    function stopRecording(){
      try{
        if(mediaRecorder && mediaRecorder.state !== 'inactive') {
          console.log('Deteniendo MediaRecorder. Estado actual:', mediaRecorder.state);
          console.log('Chunks antes de detener:', recordedChunks.length);
          
          // Asegurar que el último chunk se capture
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.requestData(); // Forzar captura del último chunk
          }
          
          mediaRecorder.stop();
          updateStatus('⏳ Procesando video...', 'idle');
        } else {
          console.warn('MediaRecorder no está activo o no existe');
          updateStatus('⚠️ No hay grabación activa para detener', 'idle');
        }
      }catch(e){
        console.error('Error al detener grabación:', e);
        updateStatus('❌ Error al detener la grabación', 'idle');
      }
      
      // Limpiar streams después de un breve delay para permitir que se procesen los chunks
      setTimeout(() => {
        cleanupStreams();
        updateButtonStates();
      }, 100);
    }
  
    function pauseRecording(){
      if(mediaRecorder && mediaRecorder.state === 'recording'){
        mediaRecorder.pause();
        updateStatus('⏸️ Grabación pausada', 'paused');
        clearInterval(timerInterval);
        updateButtonStates();
      }
    }
    
    function resumeRecording(){
      if(mediaRecorder && mediaRecorder.state === 'paused'){
        mediaRecorder.resume();
        updateStatus('🎥 Grabando...', 'recording');
        
        // Ajustar tiempo para mantener continuidad
        if(startTime) {
          pausedTime += (Date.now() - (startTime + ((Date.now()-startTime) - pausedTime)));
        }
        
        timerInterval = setInterval(updateTimer, 500);
        updateButtonStates();
      }
    }
  
    function cleanupStreams(){
      [displayStream, camStream, micStream, canvasStream].forEach(s => {
        if(!s) return;
        s.getTracks().forEach(t => t.stop());
      });
    }
  
    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
      // Evitar atajos cuando se está escribiendo en inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      
      switch(e.key) {
        case ' ':
          e.preventDefault();
          if (recordingState === 'idle') {
            startRecording();
          } else if (recordingState === 'recording') {
            pauseRecording();
          } else if (recordingState === 'paused') {
            resumeRecording();
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (recordingState === 'recording' || recordingState === 'paused') {
            addMarker();
          }
          break;
      }
      
      // Ctrl+Shift+R para detener
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (recordingState === 'recording' || recordingState === 'paused') {
          stopRecording();
        }
      }
    });
  
    // Event listeners
    startBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    pauseBtn.addEventListener('click', pauseRecording);
    resumeBtn.addEventListener('click', resumeRecording);
    markBtn.addEventListener('click', addMarker);
    clearHistoryBtn.addEventListener('click', clearHistory);
  
    // Inicialización
    updateButtonStates();
    updateStatus('🚀 Listo para grabar', 'idle');
    updateHistoryDisplay(); // Cargar historial al iniciar
  
    // Hacer funciones globales para los marcadores
    window.removeMarker = removeMarker;
  
  })();