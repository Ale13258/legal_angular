# Agente de Corrección de Features en Angular

**Agente especializado en análisis y corrección de features en Angular para el proyecto Borboleta Frontoffice.**

## Descripción

Este agente está diseñado para analizar, identificar y corregir problemas en features de Angular, siguiendo las mejores prácticas y patrones específicos del proyecto Borboleta.

## Características

- **Análisis Automático**: Revisa componentes, servicios, templates y detecta problemas comunes
- **Correcciones Inteligentes**: Propone soluciones siguiendo los patrones del proyecto
- **Validación de Arquitectura**: Asegura que las correcciones respeten la estructura del proyecto
- **Mejores Prácticas**: Aplica patrones recomendados de Angular y del proyecto

## Uso

Comando único para todos los casos (componentes, servicios, integración, RxJS, performance):

```
@corregir-feature.md

[Describe el problema, pega el código, o indica componentes a analizar]
```

**Modos**: Focal (un archivo) o Batch (varios / archivos en git) → plan priorizado con tabla de problemas.

## Estructura

```
feature-fix-agent/
├── README.md                    # Este archivo
├── feature-fix-agent.md         # Especificación completa del agente
├── examples/
│   ├── component-example.md     # Ejemplo de corrección de componente
│   ├── service-example.md       # Ejemplo de corrección de servicio
│   └── integration-example.md  # Ejemplo de corrección de integración
└── tools/
    ├── code-analysis.md         # Guía de análisis de código
    ├── angular-patterns.md      # Patrones específicos del proyecto
    ├── best-practices.md        # Mejores prácticas Angular
    └── anti-patterns.md         # Anti-patrones del proyecto
```

## Tipos de Problemas que Detecta

1. **Errores de Lógica**: Condiciones incorrectas, loops infinitos, validaciones faltantes
2. **Problemas de Integración**: NGXS, servicios, interceptores
3. **Problemas de UI**: Templates, bindings, eventos
4. **Problemas de Performance**: Memory leaks, change detection, observables no cerrados

## Patrones del Proyecto

El agente respeta los siguientes patrones del proyecto Borboleta:

- Standalone components con imports explícitos
- NGXS para state management
- RxJS con Observables y async pipe
- Servicios con `providedIn: 'root'`
- Interceptores (Auth, Error, Loader)
- i18n con ngx-translate
- Toastr para notificaciones

## Ejemplos

Ver los ejemplos en la carpeta `examples/` para casos de uso reales.

## Referencias

- [Especificación del Agente](feature-fix-agent.md)
- [Patrones del Proyecto](tools/angular-patterns.md)
- [Mejores Prácticas](tools/best-practices.md)
