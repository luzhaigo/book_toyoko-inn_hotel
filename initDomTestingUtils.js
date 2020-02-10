module.exports = async page => {
  page.evaluate(() => {
    function getElementError(message, container) {
      return new Error([message, container].filter(Boolean).join('\n\n'));
    }

    function getMultipleElementsFoundError(message, container) {
      return getElementError(
        `${message}\n\n(If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).`,
        container
      );
    }

    function getDefaultNormalizer({
      trim = true,
      collapseWhitespace = true
    } = {}) {
      return text => {
        let normalizedText = text;
        normalizedText = trim ? normalizedText.trim() : normalizedText;
        normalizedText = collapseWhitespace
          ? normalizedText.replace(/\s+/g, ' ')
          : normalizedText;
        return normalizedText;
      };
    }

    function makeFindQuery(getter) {
      return (container, text, options, waitForElementOptions) =>
        waitForElement(
          () => getter(container, text, options),
          waitForElementOptions
        );
    }

    function makeGetAllQuery(allQuery, getMissingError) {
      return (container, ...args) => {
        const els = allQuery(container, ...args);
        if (!els.length) {
          throw getElementError(getMissingError(container, ...args), container);
        }
        return els;
      };
    }

    function makeSingleQuery(allQuery, getMultipleError) {
      return (container, ...args) => {
        const els = allQuery(container, ...args);
        if (els.length > 1) {
          throw getMultipleElementsFoundError(
            getMultipleError(container, ...args),
            container
          );
        }
        return els[0] || null;
      };
    }

    function makeNormalizer({ trim, collapseWhitespace, normalizer }) {
      if (normalizer) {
        // User has specified a custom normalizer
        if (
          typeof trim !== 'undefined' ||
          typeof collapseWhitespace !== 'undefined'
        ) {
          // They've also specified a value for trim or collapseWhitespace
          throw new Error(
            'trim and collapseWhitespace are not supported with a normalizer. ' +
              'If you want to use the default trim and collapseWhitespace logic in your normalizer, ' +
              'use "getDefaultNormalizer({trim, collapseWhitespace})" and compose that into your normalizer'
          );
        }

        return normalizer;
      } else {
        // No custom normalizer specified. Just use default.
        return getDefaultNormalizer({ trim, collapseWhitespace });
      }
    }

    function fuzzyMatches(textToMatch, node, matcher, normalizer) {
      if (typeof textToMatch !== 'string') {
        return false;
      }

      const normalizedText = normalizer(textToMatch);
      if (typeof matcher === 'string') {
        return normalizedText.toLowerCase().includes(matcher.toLowerCase());
      } else if (typeof matcher === 'function') {
        return matcher(normalizedText, node);
      } else {
        return matcher.test(normalizedText);
      }
    }

    function matches(textToMatch, node, matcher, normalizer) {
      if (typeof textToMatch !== 'string') {
        return false;
      }

      const normalizedText = normalizer(textToMatch);
      if (typeof matcher === 'string') {
        return normalizedText === matcher;
      } else if (typeof matcher === 'function') {
        return matcher(normalizedText, node);
      } else {
        return matcher.test(normalizedText);
      }
    }

    const TEXT_NODE = 3;

    function getNodeText(node) {
      if (node.matches('input[type=submit], input[type=button]')) {
        return node.value;
      }

      return Array.from(node.childNodes)
        .filter(
          child => child.nodeType === TEXT_NODE && Boolean(child.textContent)
        )
        .map(c => c.textContent)
        .join('');
    }

    function buildQueries(queryAllBy, getMultipleError, getMissingError) {
      const queryBy = makeSingleQuery(queryAllBy, getMultipleError);
      const getAllBy = makeGetAllQuery(queryAllBy, getMissingError);
      const getBy = makeSingleQuery(getAllBy, getMultipleError);
      const findAllBy = makeFindQuery(getAllBy);
      const findBy = makeFindQuery(getBy);

      return [queryBy, getAllBy, getBy, findAllBy, findBy];
    }

    function queryAllByText(
      container,
      text,
      {
        selector = '*',
        exact = true,
        collapseWhitespace,
        trim,
        ignore = 'script, style',
        normalizer
      } = {}
    ) {
      const matcher = exact ? matches : fuzzyMatches;
      const matchNormalizer = makeNormalizer({
        collapseWhitespace,
        trim,
        normalizer
      });
      let baseArray = [];
      if (
        typeof container.matches === 'function' &&
        container.matches(selector)
      ) {
        baseArray = [container];
      }
      return [...baseArray, ...Array.from(container.querySelectorAll(selector))]
        .filter(node => !ignore || !node.matches(ignore))
        .filter(node =>
          matcher(getNodeText(node), node, text, matchNormalizer)
        );
    }

    const getMultipleError = (c, text) =>
      `Found multiple elements with the text: ${text}`;
    const getMissingError = (c, text) =>
      `Unable to find an element with the text: ${text}. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.`;

    const [
      queryByText,
      getAllByText,
      getByText,
      findAllByText,
      findByText
    ] = buildQueries(queryAllByText, getMultipleError, getMissingError);

    window.domTestingUtils = {
      queryByText,
      getAllByText,
      getByText,
      findAllByText,
      findByText
    };
  });
};
