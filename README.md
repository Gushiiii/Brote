# Brote · hábitos

App web instalable (PWA) para iPhone que ayuda a crear y mantener hábitos. Funciona sin internet y guarda todo en el teléfono.

## Tipos de hábito

| Tipo | Cómo se anota | Cómo se evalúa |
|---|---|---|
| **Diario** | ✓ en los días que elijas | Hecho = 100%, no hecho = 0% |
| **Veces por semana** | ✓ cada día que lo haces, hasta tu meta semanal | Cada semana vale lo que cumpliste (2 de 3 = 67%) |
| **Cantidad diaria** | + / − (vasos, páginas, minutos…) | Proporción de la meta (4 de 8 = 50%) |
| **Hora objetivo** | La hora en que lo hiciste (por ejemplo, al acostarte) | 100% dentro del margen; baja poco a poco hasta 0% si te pasas por 2 h |

La hora objetivo tiene tres modos:
- **No más tarde de** (acostarse): antes siempre es 100%.
- **No más temprano de**.
- **Lo más cerca posible de** (levantarse siempre a la misma hora).

## Funciones

- 5 hábitos de ejemplo que puedes editar o borrar, y los tuyos propios con ícono, color, días y un «por qué es importante para ti».
- **Hoy**:
  - Barra de la semana coloreada según cómo te fue cada día.
  - Progreso del día y mensajes motivadores según tu situación: rachas en riesgo, «que no sean dos días seguidos», metas semanales atrasadas, cuánto falta para tu hora meta.
  - Puedes anotar o corregir días anteriores.
- **Calendario**: cada día de rojo (fallaste la mayoría) a verde (cumpliste todo), con filtro por hábito.
- **Progreso**: cumplimiento de los últimos 7 y 30 días, días perfectos, gráfico diario y mapa de constancia. Por cada hábito: porcentaje, racha actual y mejor racha.
- **Detalle de cada hábito**: gráfico de tus horas frente a la meta, cantidades de los últimos 14 días e historial.
- **Celebraciones**: confeti al completar el día, al cumplir la meta semanal y en rachas de 3, 7, 14, 21, 30… días.
- **Registro de actividad**: cada acción queda anotada con fecha y hora.
- Respaldo (exportar e importar), hábitos archivados, tema claro u oscuro.

## Datos

Se guardan en el iPhone, en dos lugares a la vez (IndexedDB y localStorage), y siguen ahí aunque cierres la app. Exporta un respaldo de vez en cuando; la app te lo recuerda.

## Publicar y actualizar

Se publica gratis con GitHub Pages desde la rama `gh-pages`:

```
git push origin main:gh-pages
```

Antes de publicar cambios, sube el número de `CACHE` en `sw.js` (por ejemplo, `brote-v2`) para que el iPhone descargue la versión nueva.

## Instalar en el iPhone

Abre la dirección en **Safari** → **Compartir** → **Agregar a pantalla de inicio**.
