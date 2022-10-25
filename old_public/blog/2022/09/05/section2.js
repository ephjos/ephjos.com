(function (){
  const section = document.querySelector("#section-2");
  const selectType = section.querySelector("select");
  const inputStart = section.querySelector("#input-start");
  const inputReturn = section.querySelector("#input-return");
  const buttonBook = section.querySelector("button");

  const Type = Object.freeze({
    ONE_WAY: 0,
    RETURN: 1,
  });

  const _state = {
    type: Type.ONE_WAY,
    start: new Date(),
    return: new Date(),
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

  function dateToInputString(date) {
    return date.toISOString().split("T")[0];
  }

  function render(state) {
    selectType.value = state.type;
    inputStart.value = dateToInputString(state.start);
    inputReturn.value = dateToInputString(state.return);
    inputReturn.disabled = state.type === Type.ONE_WAY;
    buttonBook.disabled = state.type === Type.RETURN && state.start > state.return;
  }

  selectType.addEventListener("change", () => {
    state.type = Number(selectType.value);
  });

  inputStart.addEventListener("change", () => {
    state.start = new Date(inputStart.value);
  });

  inputReturn.addEventListener("change", () => {
    state.return = new Date(inputReturn.value);
  });

  buttonBook.addEventListener("click", () => {
    const typeString = state.type === Type.ONE_WAY ? "one-way" : "round trip";
    const onString = state.type === Type.ONE_WAY ? dateToInputString(state.start) : `${dateToInputString(state.start)}, returning ${dateToInputString(state.return)}`;
    alert(`You have booked a ${typeString} flight on ${onString}`);
  });

  render(state);
})();
