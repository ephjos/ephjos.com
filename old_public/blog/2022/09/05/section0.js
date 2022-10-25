(function (){
  const section = document.querySelector("#section-0");
  const input = section.querySelector("input");
  const button = section.querySelector("button");

  const _state = {
    count: 0,
  };

  const handler = {
    set(obj, prop, value) {
      if (obj[prop] !== value) {
        obj[prop] = value;
        render(obj);
      }
    }
  };

  const state = new Proxy(_state, handler);

  function render(state) {
    input.value = state.count;
  }

  button.addEventListener("click", () => {
    state.count += 1;
  });

  render(state);
})();
