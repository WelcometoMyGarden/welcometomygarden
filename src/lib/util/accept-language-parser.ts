// Adapted from the `accept-language-parser` package; the parameter-reassignment
// style (`options = options || {}`) is preserved from upstream.
/* eslint-disable no-param-reassign */
const regex = /((([a-zA-Z]+(-[a-zA-Z0-9]+){0,2})|\*)(;q=[0-1](\.[0-9]+)?)?)*/g;

/**
 * A parsed language tag from an `Accept-Language` header value.
 */
export interface LanguageTag {
  code: string;
  script: string | null;
  region: string | null;
  quality: number;
}

/**
 * The subset of a parsed tag used when matching against supported languages.
 */
type SupportedTag = Pick<LanguageTag, 'code' | 'script' | 'region'>;

export function parse(al: string | undefined | null): LanguageTag[] {
  const strings = (al || '').match(regex);

  if (!strings) return [];

  return strings
    .map((m): LanguageTag | undefined => {
      if (!m) {
        return undefined;
      }

      const bits = m.split(';');
      const ietf = bits[0].split('-');
      const hasScript = ietf.length === 3;

      return {
        code: ietf[0],
        script: hasScript ? ietf[1] : null,
        region: hasScript ? ietf[2] : ietf[1],
        quality: bits[1] ? parseFloat(bits[1].split('=')[1]) : 1.0
      };
    })
    .filter((r): r is LanguageTag => r !== undefined)
    .sort((a, b) => b.quality - a.quality);
}

export function pick(
  supportedLanguages: string[],
  acceptLanguage: string,
  options: { loose?: boolean } = {}
): string | null {
  if (!supportedLanguages || !supportedLanguages.length || !acceptLanguage) {
    return null;
  }

  const parsedLanguages = parse(acceptLanguage);

  const supported: SupportedTag[] = supportedLanguages.map((support) => {
    const bits = support.split('-');
    const hasScript = bits.length === 3;

    return {
      code: bits[0],
      script: hasScript ? bits[1] : null,
      region: hasScript ? bits[2] : bits[1]
    };
  });

  for (let i = 0; i < parsedLanguages.length; i++) {
    const lang = parsedLanguages[i];
    const langCode = lang.code.toLowerCase();
    const langRegion = lang.region ? lang.region.toLowerCase() : lang.region;
    const langScript = lang.script ? lang.script.toLowerCase() : lang.script;
    for (let j = 0; j < supported.length; j++) {
      const supportedCode = supported[j].code.toLowerCase();
      const supportedScript = supported[j].script
        ? supported[j].script!.toLowerCase()
        : supported[j].script;
      const supportedRegion = supported[j].region
        ? supported[j].region!.toLowerCase()
        : supported[j].region;
      if (
        langCode === supportedCode &&
        (options.loose || !langScript || langScript === supportedScript) &&
        (options.loose || !langRegion || langRegion === supportedRegion)
      ) {
        return supportedLanguages[j];
      }
    }
  }

  return null;
}
