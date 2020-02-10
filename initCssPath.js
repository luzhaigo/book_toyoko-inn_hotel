module.exports = async page => {
  return page.evaluate(() => {
    window.cssPath = function(el, anchor) {
      if (!(el instanceof Element)) return;
      const path = [];
      while (el.nodeType === Node.ELEMENT_NODE && el !== anchor) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
          selector += '#' + el.id;
        } else {
          let sib = el,
            nth = 1;
          while (sib.nodeType === Node.ELEMENT_NODE && (sib = sib.previousElementSibling) && nth++);
          selector += ':nth-child(' + nth + ')';
        }
        path.unshift(selector);
        el = el.parentNode;
      }
      return path.join(' > ');
    };
  });
};
