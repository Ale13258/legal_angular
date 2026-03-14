# Feature Agente de IA - Archivos de Implementación

**Nota importante**: Esta feature es para el **frontoffice** de Borboleta. El agente interno de Cursor se usa para crear features internas del proyecto como esta, no para crear agentes de Cursor.

Esta carpeta contiene todos los archivos necesarios para implementar la feature del Agente de IA en el frontoffice de Borboleta.

## Estructura

```
agent-ia/
├── README.md (este archivo)
├── files/
│   ├── agent.interface.ts
│   ├── agent.service.ts
│   ├── agent.component.ts
│   ├── agent.component.html
│   └── agent.component.scss
└── docs/
    └── (documentación adicional si es necesaria)
```

## Uso

Para implementar esta feature, ejecuta el comando principal:

```
@implementar-agente-ia.md
```

O sigue las instrucciones en `.cursor/commands/implementar-agente-ia.md`

## Archivos

### Interfaces
- `agent.interface.ts` - Todas las interfaces TypeScript necesarias

### Servicio
- `agent.service.ts` - Servicio para comunicación con el backend

### Componente
- `agent.component.ts` - Lógica del componente
- `agent.component.html` - Template HTML
- `agent.component.scss` - Estilos SCSS

## Notas

- Todos los archivos están listos para copiar directamente a sus ubicaciones finales
- Verificar las rutas de importación después de copiar
- El backend debe estar implementado en `/api/agent/chat` (frontoffice, no admin)
- Agregar traducciones i18n para los textos del componente
