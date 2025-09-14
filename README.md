# 🎥 TyCodEv - ScreenRec Pro

Un grabador de pantalla profesional desarrollado con tecnologías web modernas, que permite capturar pantalla, audio del sistema, micrófono y cámara web con funciones avanzadas de edición y gestión de grabaciones.

## ✨ Características

### 🎬 Grabación Avanzada
- **Grabación de pantalla completa** con múltiples resoluciones (1080p, 720p, 480p)
- **Audio del sistema** y micrófono con mezcla automática
- **Overlay de cámara web** con posicionamiento personalizable
- **Marcadores de tiempo** para navegación rápida
- **Pausa y reanudación** durante la grabación

### 🎛️ Configuraciones Flexibles
- **Calidad de video**: Alta (1080p), Media (720p), Baja (480p)
- **Frame rate**: 60 FPS, 30 FPS, 24 FPS
- **Formatos de salida**: WebM (recomendado), MP4
- **Calidad de audio**: Alta (192kbps), Media (128kbps), Baja (64kbps)

### 💾 Gestión de Archivos
- **Historial automático** con almacenamiento en IndexedDB
- **Metadatos completos** (duración, tamaño, marcadores, calidad)
- **Reproducción previa** desde el historial
- **Descarga directa** de grabaciones
- **Limpieza automática** (máximo 50 grabaciones)

### 🎨 Interfaz Moderna
- **Diseño responsivo** que se adapta a cualquier dispositivo
- **Indicadores visuales** de estado de grabación
- **Temporizador en tiempo real** con estimación de tamaño
- **Atajos de teclado** para control rápido

## 🚀 Instalación y Uso

### Requisitos
- Navegador web moderno (Chrome 72+, Firefox 63+, Safari 14+)
- Soporte para Screen Capture API
- Permisos de micrófono y cámara (opcional)

### Instalación
1. **Clona o descarga** el proyecto
2. **Abre** el archivo `index.html` en tu navegador
3. **¡Listo!** No requiere instalación adicional

### Uso Básico
1. **Configura** las opciones de grabación según tus necesidades
2. **Haz clic** en "Iniciar Grabación" o presiona `Espacio`
3. **Selecciona** la pantalla o ventana a grabar
4. **Usa los controles** para pausar, marcar tiempos o detener
5. **Descarga** tu grabación desde el enlace generado

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Espacio` | Iniciar/Pausar grabación |
| `Ctrl + Shift + R` | Detener grabación |
| `M` | Agregar marcador de tiempo |

## 🔧 Configuraciones Avanzadas

### Calidad de Video
- **Alta (1080p)**: Ideal para presentaciones y contenido detallado
- **Media (720p)**: Balance perfecto entre calidad y tamaño
- **Baja (480p)**: Para grabaciones rápidas y archivos pequeños

### Audio
- **Sistema**: Captura el audio que se reproduce en tu computadora
- **Micrófono**: Incluye tu voz o comentarios
- **Mezcla automática**: Combina ambos tipos de audio

### Overlay de Cámara
- **Posición**: Esquina inferior derecha
- **Tamaño**: 22% del ancho de pantalla
- **Estilo**: Bordes redondeados con sombra

## 📁 Estructura del Proyecto

```
grabador_pantalla/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos y diseño
├── js/
│   └── script.js       # Lógica de grabación
├── img/
│   └── logo.png        # Logo de TyCodEv
└── README.md           # Este archivo
```

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica y accesible
- **CSS3**: Diseño moderno con gradientes y animaciones
- **JavaScript ES6+**: Lógica de grabación y gestión de archivos
- **Screen Capture API**: Captura de pantalla nativa
- **MediaRecorder API**: Grabación de video y audio
- **IndexedDB**: Almacenamiento local de grabaciones
- **Canvas API**: Composición y overlay de video

## 🔒 Privacidad y Seguridad

- **Sin servidor**: Todo funciona localmente en tu navegador
- **Datos privados**: Las grabaciones se almacenan solo en tu dispositivo
- **Permisos explícitos**: El navegador solicita permisos antes de grabar
- **Sin tracking**: No se recopila información personal

## 🐛 Solución de Problemas

### Problema: "No se puede acceder a la pantalla"
**Solución**: Asegúrate de que el navegador tenga permisos para capturar pantalla.

### Problema: "Video muy pequeño al reproducir"
**Solución**: 
- Verifica que la grabación duró el tiempo esperado
- Revisa la consola del navegador para errores
- Intenta con una configuración de menor calidad

### Problema: "No se escucha el audio"
**Solución**: 
- Verifica que "Audio del sistema" esté habilitado
- Asegúrate de que hay audio reproduciéndose
- Algunos navegadores requieren interacción del usuario

### Problema: "Error de memoria"
**Solución**: 
- Reduce la calidad de grabación
- Graba sesiones más cortas
- Limpia el historial de grabaciones

## 📊 Límites y Consideraciones

- **Duración máxima**: Limitada por la memoria disponible del navegador
- **Tamaño de archivo**: Depende de la calidad y duración seleccionada
- **Navegadores compatibles**: Chrome, Firefox, Safari (versiones recientes)
- **Sistemas operativos**: Windows, macOS, Linux

## 🤝 Contribuciones

Este proyecto es desarrollado por **TyCodEv**. Si encuentras bugs o tienes sugerencias:

1. **Reporta problemas** con detalles del navegador y sistema
2. **Sugiere mejoras** con casos de uso específicos
3. **Comparte feedback** sobre la experiencia de usuario

## 📄 Licencia

Este proyecto es de código abierto. Puedes usarlo, modificarlo y distribuirlo libremente.

## 👨‍💻 Desarrollado por

**TyCodEv** - Desarrollador de soluciones web innovadoras

### Redes Sociales
- [YouTube](https://www.youtube.com/)
- [TikTok](https://www.tiktok.com/)
- [Instagram](https://www.instagram.com/)
- [Facebook](https://www.facebook.com/)
- [GitHub](https://github.com/)

---

## 🎯 Próximas Funcionalidades

- [ ] **Editor de video básico** con cortes y transiciones
- [ ] **Efectos de cursor** personalizables
- [ ] **Grabación programada** con temporizador
- [ ] **Exportación a múltiples formatos** (GIF, MP4, AVI)
- [ ] **Plantillas de overlay** predefinidas
- [ ] **Sincronización en la nube** (opcional)

---

*¿Te gusta este proyecto? ¡Dale una estrella y compártelo! ⭐*
