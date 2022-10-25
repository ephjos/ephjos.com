(function (){
  const section = document.querySelector("#section-1");
  const inputCelsius = section.querySelector("#input-celsius");
  const inputFahrenheit = section.querySelector("#input-fahrenheit");

  const _state = {
    celsius: 0,
    fahrenheit: 32,
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
    inputCelsius.value = state.celsius;
    inputFahrenheit.value = state.fahrenheit;
  }

  inputCelsius.addEventListener("change", () => {
    state.celsius = inputCelsius.value;
    state.fahrenheit = inputCelsius.value * (9/5) + 32;
  });

  inputFahrenheit.addEventListener("change", () => {
    state.celsius = (inputFahrenheit.value - 32) * (5/9);
    state.fahrenheit = inputFahrenheit.value;
  });

  render(state);
})();
