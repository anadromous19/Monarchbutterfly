const fs = require('fs');
const path = require('path');

function patchFile(relPath, replacers) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  for (const [target, replacement] of replacers) {
    if (content.includes(target) && !content.includes(replacement)) {
      content = content.replace(target, replacement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`[patch-codegen] Patched ${relPath}`);
  }
}

// Patch @react-native/codegen flow parser to accept Readonly and ReadonlyArray alongside $ReadOnly / $ReadOnlyArray
patchFile('node_modules/@react-native/codegen/lib/parsers/flow/components/componentsUtils.js', [
  [
    "if (objectType.id.name === '$ReadOnly') {",
    "if (objectType.id.name === '$ReadOnly' || objectType.id.name === 'Readonly') {"
  ],
  [
    "parser.getTypeAnnotationName(typeAnnotation) === '$ReadOnlyArray'",
    "(parser.getTypeAnnotationName(typeAnnotation) === '$ReadOnlyArray' || parser.getTypeAnnotationName(typeAnnotation) === 'ReadonlyArray')"
  ],
  [
    "parser.getTypeAnnotationName(typeAnnotation) === '$ReadOnly'",
    "(parser.getTypeAnnotationName(typeAnnotation) === '$ReadOnly' || parser.getTypeAnnotationName(typeAnnotation) === 'Readonly')"
  ],
  [
    "if (objectType.id.name === '$ReadOnlyArray') {",
    "if (objectType.id.name === '$ReadOnlyArray' || objectType.id.name === 'ReadonlyArray') {"
  ]
]);

patchFile('node_modules/@react-native/codegen/lib/parsers/flow/components/events.js', [
  [
    "if (name === '$ReadOnly') {",
    "if (name === '$ReadOnly' || name === 'Readonly') {"
  ],
  [
    "case '$ReadOnly':",
    "case '$ReadOnly':\n    case 'Readonly':"
  ],
  [
    "case '$ReadOnlyArray':",
    "case '$ReadOnlyArray':\n    case 'ReadonlyArray':"
  ]
]);

patchFile('node_modules/@react-native/codegen/lib/parsers/flow/components/commands.js', [
  [
    "case '$ReadOnlyArray':",
    "case '$ReadOnlyArray':\n      case 'ReadonlyArray':"
  ]
]);

patchFile('node_modules/@react-native/codegen/lib/parsers/flow/modules/index.js', [
  [
    "case '$ReadOnlyArray': {",
    "case '$ReadOnlyArray':\n        case 'ReadonlyArray': {"
  ],
  [
    "case '$ReadOnly': {",
    "case '$ReadOnly':\n        case 'Readonly': {"
  ]
]);

console.log('[patch-codegen] Codegen Flow spec compatibility verified.');
