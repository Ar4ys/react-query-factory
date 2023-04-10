import type ts from 'typescript/lib/tsserverlibrary';

function init(modules: { typescript: typeof ts }) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    const log = (...data: unknown[]) =>
      info.project.projectService.logger.info(`[mine] ${JSON.stringify(data, undefined, 2)}`);

    log("I'm getting set up now! Check the log for this message.");

    const overrides: Partial<ts.LanguageService> = {
      getCompletionEntryDetails(
        fileName,
        position,
        entryName,
        formatOptions,
        source,
        preferences,
        data,
      ) {
        const result = info.languageService.getCompletionEntryDetails(
          fileName,
          position,
          entryName,
          formatOptions,
          source,
          preferences,
          data,
        );

        // if (!result?.codeActions) return result;

        const program = info.languageService.getProgram();
        const file = program?.getSourceFile(fileName);
        const vitestIf = file
          ?.getChildren()
          .map((a) =>
            a.getChildren().find((b) => b.getFullText().match(/^\s*if \(import.meta.vitest\)/)),
          )
          .filter((a) => !!a)[0];

        if (!vitestIf || position < vitestIf.pos || position > vitestIf.end) return result;

        file.update;

        const ifBody = vitestIf.getChildAt(4).getChildAt(1);
        const lastImportNode = ifBody
          .getChildren()
          .find((node) => node.getFullText().match(/await import\(.*\);?$/));

        const insertPos = lastImportNode?.end ?? ifBody.pos;

        function findImport(
          node: ts.Node,
          importFile: string | undefined,
        ): ts.VariableDeclaration | undefined {
          for (const child of node.getChildren()) {
            log(ts.SyntaxKind[child.kind], child.getFullText());

            if (ts.isStatement(child)) {
              const a = findImport(child, importFile);
              if (a) return a;
            } else if (ts.isVariableDeclarationList(child)) {
              child.getFullStart;
              const targetImport = child.declarations.find(
                (declaration) =>
                  declaration.initializer &&
                  ts.isAwaitExpression(declaration.initializer) &&
                  ts.isCallExpression(declaration.initializer.expression) &&
                  declaration.initializer.expression.expression.getText() === 'import' &&
                  declaration.initializer.expression.arguments[0] &&
                  ts.isStringLiteral(declaration.initializer.expression.arguments[0]) &&
                  declaration.initializer.expression.arguments[0].text === importFile,
              );

              return targetImport;
            }
          }
        }

        log({
          ...result,
          displayParts: undefined,
          source1: source,
          data,
          getLeadingTriviaWidth: lastImportNode?.getLeadingTriviaWidth(),
          position: file.getLineAndCharacterOfPosition(insertPos),
          children: findImport(ifBody, 'vitest')
            ?.getChildren()
            .map((a) => ({ kind: ts.SyntaxKind[a.kind], text: a.getFullText() })),
        });

        if (!result?.codeActions) return result;

        // const repeatString = (text: string, count: number) => Array(count).fill(text).join('');

        const importNode = findImport(ifBody, source);

        result.codeActions = result.codeActions.map((action) => {
          action.changes = action.changes.map((change) => {
            if (change.fileName !== fileName) return change;

            change.textChanges = change.textChanges.map((textChange) => {
              if (importNode && ts.isObjectBindingPattern(importNode.name)) {
                action.description = `Update import for "${source}"`;

                textChange.span = {
                  start: importNode.name.elements.end,
                  length: 0,
                };

                const leadingComma = importNode.name.elements.hasTrailingComma ? '' : ',';
                const trailingComma = importNode.name.elements.hasTrailingComma ? ',' : '';
                textChange.newText = `${leadingComma} ${result.name}${trailingComma}`;

                return textChange;
              } else {
                action.description = `Add import from "${source}"`;
                textChange.span = {
                  start: insertPos,
                  length: 0,
                };

                textChange.newText = `\nconst { ${result.name} } = await import('${source}')`;
                return textChange;
              }
            });

            return change;
          });

          return action;
        });

        return result;
      },

      // getCodeFixesAtPosition(fileName, start, end, errorCodes, formatOptions, preferences) {
      //   const result = info.languageService.getCodeFixesAtPosition(
      //     fileName,
      //     start,
      //     end,
      //     errorCodes,
      //     formatOptions,
      //     preferences
      //   );
      //   log('getCodeFixesAtPosition', result);
      //   return result;
      // },

      // getCombinedCodeFix(scope, fixId, formatOptions, preferences) {
      //   const result = info.languageService.getCombinedCodeFix(
      //     scope,
      //     fixId,
      //     formatOptions,
      //     preferences
      //   );
      //   log('getCombinedCodeFix', result);
      //   return result;
      // },
    };

    const proxy = new Proxy(info.languageService, {
      get(target, key) {
        const typedKey = key as keyof typeof info.languageService;
        log(`Called proxy ${String(key)}`);
        return overrides[typedKey] ?? target[typedKey];
      },
    });

    return proxy;
  }

  return { create };
}

export = init;
