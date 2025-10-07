import { $, $$ } from './utils.js';
import { saveAndSyncSetting } from './utils.js';
import { applyDoodle } from './app.js';

/**
 * Definición de los doodles disponibles.
 * Cada doodle tiene un id, nombre y la plantilla de css-doodle.
 */
export const DOODLES = [
  {
    id: 'none',
    name: 'Ninguno',
    template: ''
  },
  {
    id: 'lluvia-estrellas',
    name: 'Lluvia de Estrellas',
    template: `<css-doodle>
      :doodle {
        @grid: 1x20 / 100vw 100vh;
        position: absolute;
        top: 0; left: 0;
        z-index: -1;
      }

      @size: @r(1px, 2px) @r(50px, 150px);
      background: linear-gradient(to bottom,
        hsla(0, 0%, 100%, @r(.5, 1)),
        hsla(0, 0%, 100%, 0)
      );
      filter: drop-shadow(0 0 8px #fff);
      position: absolute;
      left: @r(100vw);
      top: @r(-10vh, 90vh);
      animation: fall @r(8s, 20s) linear infinite;
      animation-delay: -@r(20s);

      @keyframes fall {
        to { transform: translate(-100vw, 100vh) rotate(45deg); }
      }
    </css-doodle>`
  },
  {
    id: 'circulos-transicion',
    name: 'Círculos en Transición',
    template: `<css-doodle>
      :doodle {
        @grid: 8 / 90%;
        @shape: circle;
      }
      transition: .2s @r(.6s);
      border-radius: @pick(100% 0, 0 100%);
      transform: scale(@r(.25, 1.25));
      background: hsla(
        calc(240 - 6 * @x * @y),
        70%, 68%, @r(.8)
      );
    </css-doodle>`
  },
  {
    id: 'lineas-neon',
    name: 'Líneas de Neón',
    template: `<css-doodle>
      :doodle {
        @grid: 14 / 100vmax;
      }
      @random {
        border-left: 1px solid #5d81bc;
      }
      @random {
        border-top: 1px solid #5d81bc;
      }
      @random(.25) {
        background: linear-gradient(
          @p(#fff, tan, #5d81bc), @lp
        )
        50% / @r(60%) @lr
        no-repeat;
      }
      @random {
        filter: drop-shadow(0 0 10px #fff);
      }
    </css-doodle>`
  },
  {
    id: 'trazos-svg',
    name: 'Trazos SVG',
    template: `<css-doodle>
      :doodle {
        @grid: 1 / 100vw 100vh;
        display: grid;
        place-items: center;
      }
      @content: @svg(
        viewBox: 0 0 16 16 p 1;
        stroke: #aeacfb;
        stroke-width: .1;
        stroke-linecap: round;
        line*16x16 {
          draw: @r(2s);
          x1, y1, x2, y2: @p(
            @nx(-1) @ny(-1) @nx @ny,
            @nx @ny(-1) @nx(-1) @ny,
            @nx @ny(-1) @nx @ny
          );
        }
      );
    </css-doodle>`
  },
  {
    id: 'flor-radial',
    name: 'Flor Radial',
    template: `<css-doodle>
      :doodle {
        @grid: 1 / 35% auto;
        position: absolute;
        top: 0;
        left: 0;
        background: radial-gradient(pink, yellow, red, red);
        mask: @svg-polygon(split: 400; scale: .7; r: cos(7t)^4 + sin(7t) +.3;);
      }
    </css-doodle>`
  },
  {
    id: 'mosaico-cajas',
    name: 'Mosaico de Cajas',
    template: `<css-doodle click-to-update>
      <style>
        @grid: 1 / 100vw 100vh / #0a0c27;
        background-size: 200px 200px;
        background-image: @doodle(
          @grid: 6 / 100%;
          @size: 4px;
          font-size: 4px;
          color: hsl(@r240, 30%, 50%);
          box-shadow: @m3x5(
            calc(4em - @nx * 1em) calc(@ny * 1em)
              @p(@m3(currentColor), @m2(transparent)),
            calc(2em + @nx * 1em) calc(@ny * 1em)
              @lp
          );
        );
      </style>
    </css-doodle>`
  },
  {
    id: 'caracteres-aleatorios',
    name: 'Caracteres Aleatorios',
    template: `<css-doodle click-to-update>
      <style>
        @grid: 20 / 100vmax / #0a0c27;
        :after {
          content: @code.r(0x2500, 0x257f);
          color: hsla(@r360, 70%, 70%, @r.9);
          position: absolute;
          font-size: 5cqmax;
          font-family: sans-serif;
        }
      </style>
    </css-doodle>`
  },
  {
    id: 'galaxia-espiral',
    name: 'Galaxia Espiral',
    template: `<css-doodle>
      <style>
        @grid: 1 / 100vw 100vh / #125cde;
        background-size: cover;
        background-position: 50% 50%;
        background-image: @doodle(
          @content: @svg(
            viewBox: -50 -50 100 100 p -20;
            circle*500 {
              fill: hsl(@calc(120-90*@sin.n), 80%, 50%);
              r: @sqrt(@n\/60);
              cx: @(@n*.618^4 * cos(2*π*@n*.618));
              cy: @(@n*.618^4 * sin(2*π*@n*.618));
            }
          );
        );
      </style>
    </css-doodle>`
  },
  {
    id: 'lineas-aleatorias-svg',
    name: 'Líneas Aleatorias SVG',
    template: `<css-doodle click-to-update>
      :doodle {
        @grid: 1 / 100vw 100vh;
        background-size: 100%;
        background-image: @svg(
          <svg viewBox="0 0 100 175">
            @M50(<path
              stroke-width="@r(.5)"
              stroke="@p(#60569e, #e6437d)"
              d="M 0 0 L \@r(100) \@r(175)"
            />)
          </svg>
        );
      }
    </css-doodle>`
  },
  {
    id: 'mosaico-anidado',
    name: 'Mosaico Anidado',
    template: `<css-doodle click-to-update>
      :doodle {
        @grid: @p(2, 3) / 12em;
      }
      background-image: @doodle(
        @grid: @r4 / 100%;
        background: @doodle(
          @grid: @r4 / 100%;
          background: @svg(
            viewBox: 0 0 1 1;
            path {
              d: M 0 0 L 1 0 L 1 1;
              fill: #60569e;
            }
          );
        );
      );
    </css-doodle>`
  },
  {
    id: 'barras-aleatorias',
    name: 'Barras Aleatorias',
    template: `<css-doodle grid="1x35">
      :doodle {
        @size: 100vw 100vh;
        gap: 1px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      background: #60569e;
      width: @rand(5%, 100%);
      height: 1.5%;
    </css-doodle>`
  },
  {
    id: 'cuadrados-aleatorios',
    name: 'Cuadrados Aleatorios',
    template: `<css-doodle>
      :doodle {
        @grid: 10 / 100vmax;
      }
      background: #60569e;
      transform: scale(@r(.2, .9));
    </css-doodle>`
  }
];

export function initDoodleSettings(activeDoodleId) {
  const doodleList = $('#doodle-list');
  doodleList.innerHTML = ''; // Limpiar la lista

  DOODLES.forEach(doodle => {
    const button = document.createElement('button');
    button.className = 'doodle-item';
    button.dataset.doodleId = doodle.id;
    button.innerHTML = `
      <div class="doodle-item-preview ${doodle.id}">
        ${doodle.template || ''}
      </div>
      <span class="doodle-item-name">${doodle.name}</span>
    `;
    if (doodle.id === 'none') {
      button.querySelector('.doodle-item-preview').classList.add('none');
    }
    button.addEventListener('click', () => handleDoodleSelection(doodle.id));
    // Pausar la animación de la miniatura para mejorar el rendimiento
    const doodleElement = button.querySelector('css-doodle');
    if (doodleElement) doodleElement.pause();

    doodleList.appendChild(button);
  });

  updateDoodleSelectionUI(activeDoodleId);
}

function handleDoodleSelection(doodleId) {
  saveAndSyncSetting({ doodle: doodleId });
  applyDoodle(doodleId); // ¡Añadido! Actualiza el doodle en tiempo real.
  updateDoodleSelectionUI(doodleId);
}

export function updateDoodleSelectionUI(doodleId) {
  $$('#doodle-list .doodle-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.doodleId === doodleId);
  });
  // La lógica para actualizar la vista previa ahora está en applyDoodle
  // para mantener la consistencia.
}