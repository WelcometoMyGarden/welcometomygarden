import pkg from 'maplibre-gl';
import type { IControl, Map } from 'maplibre-gl';
const { Evented } = pkg;

// This is the  v2.x TS FullscreenControl version, which includes a `fullscreenstart` and `fullscreenend` event.
// Dependencies were inlined
// https://github.com/maplibre/maplibre-gl-js/blob/c03607bad8a0d6574e9738b23fa84f3620713df5/src/ui/control/fullscreen_control.ts
//
// The previously shipped the old 1.x JS version, which is guaranteed compatible with our v1.x library, but does not include this
// https://github.com/maplibre/maplibre-gl-js/blob/c03607bad8a0d6574e9738b23fa84f3620713df5/src/ui/control/fullscreen_control.ts#L44
//
// import DOM from '../../util/dom';

//// "polyfill" implementations
const DOM = {
  // https://github.com/maplibre/maplibre-gl-js/blob/c03607bad8a0d6574e9738b23fa84f3620713df5/src/util/dom.ts#L22
  create(tagName: string, className?: string, container?: HTMLElement) {
    const el = window.document.createElement(tagName);
    if (className !== undefined) el.className = className;
    if (container) container.appendChild(el);
    return el;
  },
  // https://github.com/maplibre/maplibre-gl-js/blob/c03607bad8a0d6574e9738b23fa84f3620713df5/src/util/dom.ts#L111
  remove(node: HTMLElement) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
};

/**
 * https://github.com/maplibre/maplibre-gl-js/blob/c03607bad8a0d6574e9738b23fa84f3620713df5/src/util/util.ts#L136
 * Given a destination object and optionally many source objects,
 * copy all properties from the source objects into the destination.
 * The last source object given overrides properties from previous
 * source objects.
 *
 * @param dest destination object
 * @param sources sources from which properties are pulled
 * @private
 */
export function extend(dest: any, ...sources: Array<any>): any {
  for (const src of sources) {
    for (const k in src) {
      dest[k] = src[k];
    }
  }
  return dest;
}

// https://github.com/maplibre/maplibre-gl-js/blob/c03607bad8a0d6574e9738b23fa84f3620713df5/src/util/evented.ts#L24
class Event {
  readonly type: string;

  constructor(type: string, data: any = {}) {
    extend(this, data);
    this.type = type;
  }
}

function warnOnce(message: string) {
  // Not once, but OK
  console.warn(message);
}

// https://github.com/maplibre/maplibre-gl-js/blob/c03607bad8a0d6574e9738b23fa84f3620713df5/src/ui/map.ts#L128
/**
 * An options object for the gesture settings
 * @example
 * let options = {
 *   windowsHelpText: "Use Ctrl + scroll to zoom the map",
 *   macHelpText: "Use ⌘ + scroll to zoom the map",
 *   mobileHelpText: "Use two fingers to move the map",
 * }
 */
export type GestureOptions = {
  windowsHelpText?: string;
  macHelpText?: string;
  mobileHelpText?: string;
};

////// Implementation, sort of untouched

type FullscreenOptions = {
  container?: HTMLElement;
};

/**
 * A `FullscreenControl` control contains a button for toggling the map in and out of fullscreen mode.
 * When [requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) is not supported, fullscreen is handled via CSS properties.
 * The map's `cooperativeGestures` option is temporarily disabled while the map
 * is in fullscreen mode, and is restored when the map exist fullscreen mode.
 *
 * @implements {IControl}
 * @param {Object} [options]
 * @param {HTMLElement} [options.container] `container` is the [compatible DOM element](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullScreen#Compatible_elements) which should be made full screen. By default, the map container element will be made full screen.
 *
 * @example
 * map.addControl(new maplibregl.FullscreenControl({container: document.querySelector('body')}));
 * @see [View a fullscreen map](https://maplibre.org/maplibre-gl-js-docs/example/fullscreen/)
 */

/**
 * Fired when fullscreen mode has started
 *
 * @event fullscreenstart
 * @memberof FullscreenControl
 * @instance
 */

/**
 * Fired when fullscreen mode has ended
 *
 * @event fullscreenend
 * @memberof FullscreenControl
 * @instance
 */

class FullscreenControl extends Evented implements IControl {
  _map: Map;
  _controlContainer: HTMLElement;
  _fullscreen: boolean;
  _fullscreenchange: string;
  _fullscreenButton: HTMLButtonElement;
  _container: HTMLElement;
  _prevCooperativeGestures: boolean | GestureOptions;

  constructor(options: FullscreenOptions = {}) {
    super();
    this._fullscreen = false;

    if (options && options.container) {
      if (options.container instanceof HTMLElement) {
        this._container = options.container;
      } else {
        warnOnce("Full screen control 'container' must be a DOM element.");
      }
    }

    if ('onfullscreenchange' in document) {
      this._fullscreenchange = 'fullscreenchange';
    } else if ('onmozfullscreenchange' in document) {
      this._fullscreenchange = 'mozfullscreenchange';
    } else if ('onwebkitfullscreenchange' in document) {
      this._fullscreenchange = 'webkitfullscreenchange';
    } else if ('onmsfullscreenchange' in document) {
      this._fullscreenchange = 'MSFullscreenChange';
    }
  }

  onAdd(map: Map) {
    this._map = map;
    if (!this._container) this._container = this._map.getContainer();
    this._controlContainer = DOM.create('div', 'maplibregl-ctrl maplibregl-ctrl-group');
    this._setupUI();
    return this._controlContainer;
  }

  onRemove() {
    DOM.remove(this._controlContainer);
    this._map = null;
    window.document.removeEventListener(this._fullscreenchange, this._onFullscreenChange);
  }

  _setupUI() {
    const button = (this._fullscreenButton = DOM.create(
      'button',
      'maplibregl-ctrl-fullscreen',
      this._controlContainer
    ));
    DOM.create('span', 'maplibregl-ctrl-icon', button).setAttribute('aria-hidden', 'true');
    button.type = 'button';
    this._updateTitle();
    this._fullscreenButton.addEventListener('click', this._onClickFullscreen);
    window.document.addEventListener(this._fullscreenchange, this._onFullscreenChange);
  }

  _updateTitle() {
    const title = this._getTitle();
    this._fullscreenButton.setAttribute('aria-label', title);
    this._fullscreenButton.title = title;
  }

  _getTitle() {
    return this._map._getUIString(
      this._isFullscreen() ? 'FullscreenControl.Exit' : 'FullscreenControl.Enter'
    );
  }

  _isFullscreen() {
    return this._fullscreen;
  }

  _onFullscreenChange = () => {
    const fullscreenElement =
      window.document.fullscreenElement ||
      (window.document as any).mozFullScreenElement ||
      (window.document as any).webkitFullscreenElement ||
      (window.document as any).msFullscreenElement;

    if ((fullscreenElement === this._container) !== this._fullscreen) {
      this._handleFullscreenChange();
    }
  };

  _handleFullscreenChange() {
    this._fullscreen = !this._fullscreen;
    this._fullscreenButton.classList.toggle('maplibregl-ctrl-shrink');
    this._fullscreenButton.classList.toggle('maplibregl-ctrl-fullscreen');
    this._updateTitle();

    if (this._fullscreen) {
      this.fire(new Event('fullscreenstart'));
      if (this._map._cooperativeGestures) {
        this._prevCooperativeGestures = this._map._cooperativeGestures;
        this._map.setCooperativeGestures();
      }
    } else {
      this.fire(new Event('fullscreenend'));
      if (this._prevCooperativeGestures) {
        this._map.setCooperativeGestures(this._prevCooperativeGestures);
        delete this._prevCooperativeGestures;
      }
    }
  }

  _onClickFullscreen = () => {
    if (this._isFullscreen()) {
      this._exitFullscreen();
    } else {
      this._requestFullscreen();
    }
  };

  _exitFullscreen() {
    if (window.document.exitFullscreen) {
      (window.document as any).exitFullscreen();
    } else if ((window.document as any).mozCancelFullScreen) {
      (window.document as any).mozCancelFullScreen();
    } else if ((window.document as any).msExitFullscreen) {
      (window.document as any).msExitFullscreen();
    } else if ((window.document as any).webkitCancelFullScreen) {
      (window.document as any).webkitCancelFullScreen();
    } else {
      this._togglePseudoFullScreen();
    }
  }

  _requestFullscreen() {
    if (this._container.requestFullscreen) {
      this._container.requestFullscreen();
    } else if ((this._container as any).mozRequestFullScreen) {
      (this._container as any).mozRequestFullScreen();
    } else if ((this._container as any).msRequestFullscreen) {
      (this._container as any).msRequestFullscreen();
    } else if ((this._container as any).webkitRequestFullscreen) {
      (this._container as any).webkitRequestFullscreen();
    } else {
      this._togglePseudoFullScreen();
    }
  }

  _togglePseudoFullScreen() {
    this._container.classList.toggle('maplibregl-pseudo-fullscreen');
    this._handleFullscreenChange();
    this._map.resize();
  }
}

export default FullscreenControl;
