/**
 * Level XML loader. Port of LevelCreator.cs.
 *
 * The original C# code uses reflection: for each XML element it calls
 * `Activator.CreateInstance` to construct the object, then for each child
 * element it tries SetX / AddX / X methods in that order.
 *
 * We reproduce that behavior via:
 *   - CLASS_REGISTRY: tag name -> constructor (called as `new Cls(...params)`)
 *   - Setters declared on each class via a conventional naming scheme:
 *     methods called `setFoo(...)` / `addFoo(...)` / `foo(...)` for tag `<Foo>`.
 *
 * See the class docstrings for the setter vocabulary of each type.
 *
 * Argument parsing rules (from LevelCreator.ParseArguments):
 *   - comma-separated list
 *   - "true"/"false" (case-insensitive) -> boolean
 *   - int, else float, else string
 *   - hashed object references: if an arg matches a previously-declared
 *     `hash="name"` attribute, substitute the object
 */

/** Parse a C#-style comma-separated arg string into an array of primitives. */
export function parseArguments(argsStr, hashedObjects) {
  if (argsStr == null || argsStr.length === 0) return [];
  const parts = argsStr.split(',').map(s => s.trim());
  return parts.map(p => {
    if (hashedObjects && Object.prototype.hasOwnProperty.call(hashedObjects, p)) {
      return hashedObjects[p];
    }
    const lower = p.toLowerCase();
    if (lower === 'true')  return true;
    if (lower === 'false') return false;
    // Integer first (no decimal point)
    if (/^-?\d+$/.test(p)) {
      const n = parseInt(p, 10);
      if (!Number.isNaN(n)) return n;
    }
    // Float
    const f = parseFloat(p);
    if (!Number.isNaN(f) && /^-?\d/.test(p)) return f;
    // Fall through: keep as string
    return p;
  });
}

/**
 * Resolve the method to call on `obj` for a given tag name.
 * Tries: set<Name>, add<Name>, <Name (lowercased first char)>, <Name>.
 * Returns the bound function or null if none found.
 *
 * Note: C# sources use PascalCase method names (SetX, AddX). We use camelCase
 * in JS (setX, addX). The XML tags themselves are PascalCase.
 */
export function resolveSetter(obj, tagName) {
  // SetFoo -> setFoo
  const setName = 'set' + tagName;
  // AddFoo -> addFoo
  const addName = 'add' + tagName;
  // Foo -> foo (fallback direct method)
  const directName = tagName.charAt(0).toLowerCase() + tagName.slice(1);
  // As-written Foo (in case source used PascalCase method directly)
  const directNamePascal = tagName;

  for (const name of [setName, addName, directName, directNamePascal]) {
    const fn = obj[name];
    if (typeof fn === 'function') {
      return fn.bind(obj);
    }
  }
  return null;
}

/**
 * A class registry: tag name -> constructor.
 * Each constructor is called with (...params) parsed from the `params=` XML attribute.
 * The registry is populated by calling registerClass(); classes live in src/objects/.
 */
const CLASS_REGISTRY = {};

export function registerClass(tagName, ctor) {
  CLASS_REGISTRY[tagName] = ctor;
}

export function getClass(tagName) {
  return CLASS_REGISTRY[tagName];
}

/**
 * Parse an XML element into a game object by instantiating the mapped class
 * and dispatching each child element to a setter method.
 *
 * @param {Element} element  DOM Element
 * @param {object}  hashedObjects  hash -> object map (shared across parse)
 * @returns {object}         constructed object (or null if tag is not registered)
 */
export function parseNode(element, hashedObjects) {
  const tagName = element.tagName;
  const paramsAttr = element.getAttribute('params');
  const typeAttr   = element.getAttribute('type');
  const hashAttr   = element.getAttribute('hash');

  const className = typeAttr || tagName;
  const Cls = CLASS_REGISTRY[className];
  if (!Cls) {
    throw new Error(`Unknown level tag '${className}' - register a class for it`);
  }

  const args = parseArguments(paramsAttr, hashedObjects);
  const obj = new Cls(...args);

  if (hashAttr) hashedObjects[hashAttr] = obj;

  // Iterate child element nodes (skip text/whitespace/comments)
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType !== 1 /* Element */) continue;
    const childTag = child.tagName;
    const hasNestedElements = Array.from(child.childNodes)
      .some(n => n.nodeType === 1);

    let argList;
    if (hasNestedElements) {
      const nestedObj = parseNode(child, hashedObjects);
      argList = [nestedObj];
    } else {
      const text = child.textContent;
      argList = parseArguments(text, hashedObjects);
    }

    const setter = resolveSetter(obj, childTag);
    if (!setter) {
      throw new Error(
        `No method for <${childTag}> on class ${className} ` +
        `(tried set${childTag}, add${childTag}, ${childTag[0].toLowerCase() + childTag.slice(1)})`
      );
    }
    setter(...argList);
  }

  return obj;
}

/**
 * Top-level entry point: parse a level XML string into a Level object.
 * @param {string} xmlText
 * @returns {object} the constructed Level
 */
export function parseLevelFromString(xmlText) {
  // Strip UTF-8 BOM if present - the level XMLs were authored on Windows
  // and all start with \uFEFF, which strict XML parsers reject.
  if (xmlText.charCodeAt(0) === 0xFEFF) xmlText = xmlText.slice(1);
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  // DOMParser swallows errors into a <parsererror> element - check for it
  const err = doc.getElementsByTagName('parsererror')[0];
  if (err) throw new Error('Malformed level XML: ' + err.textContent);

  const root = doc.documentElement;
  const hashedObjects = {};
  return parseNode(root, hashedObjects);
}

/**
 * Load an XML file from the public dir and parse it.
 * Works in both Vite dev and prod since /levels/ is a static asset path.
 */
export async function loadLevel(filename) {
  const url = `/levels/${filename}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  const text = await resp.text();
  return parseLevelFromString(text);
}
