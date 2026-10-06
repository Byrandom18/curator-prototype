(function () {
  const esc = function (value) { return window.Store.esc(value); };
  const formatDate = function (value) { return window.Store.formatDate(value); };

  function projectOf(state) {
    return state.projects.filter(function (project) { return project.id === state.ui.projectId; })[0] || state.projects[0];
  }

  function studentsOf(state, projectId) {
    return state.students.filter(function (student) { return student.projectId === projectId; });
  }

  function iterationsOf(state, projectId) {
    return state.iterations.filter(function (iteration) { return iteration.projectId === projectId; });
  }

  function sidebar(state) {
    function item(label, go, active, sub) {
      return '<button class="' + (sub ? "sub " : "") + (active ? "active" : "") + '" data-go="' + go + '">' + label + "</button>";
    }
    return (
      '<aside class="tside">' +
        item("О проекте", "team/project/" + (state.ui.projectId || ""), state.ui.route === "project", false) +
        item("Задачи", "team/project/" + (state.ui.projectId || ""), false, false) +
        '<button data-action="stub" data-title="Команда">Команда</button>' +
        '<button data-action="stub" data-title="Лента событий">Лента событий</button>' +
        '<button data-action="stub" data-title="Документы">Документы</button>' +
        '<button data-action="stub" data-title="Обсуждение">Обсуждение</button>' +
        item("Результаты и оценки", "team/project/" + (state.ui.projectId || ""), false, false) +
        '<button class="sub" data-action="focus-grades">Оценка по итерациям</button>' +
      "</aside>"
    );
  }

  function draftPanel(state) {
    const draft = state.ui.draft;
    if (!draft || draft.projectId !== state.ui.projectId) return "";
    const tasks = draft.tasks.map(function (task, index) {
      const student = state.students.filter(function (item) { return item.id === task.studentId; })[0];
      return (
        '<div class="draft-task"><span class="note" style="width:140px">' + esc(student ? student.name : task.role) + "</span>" +
        '<input data-draft-index="' + index + '" value="' + esc(task.title) + '">' +
        '<button class="btn tiny" type="button" data-action="drop-draft-task" data-index="' + index + '">Убрать</button></div>'
      );
    }).join("");
    return (
      '<form class="card" id="draft-form"><h2>Новая итерация</h2>' +
      '<label class="field">Название<input name="title" value="' + esc(draft.title) + '"></label>' +
      '<label class="field">Срок<input name="due" type="date" value="' + esc(draft.due) + '"></label>' +
      tasks +
      '<div class="row-actions"><button class="btn primary" type="submit">Создать итерацию</button>' +
      '<button class="btn" type="button" data-action="cancel-draft">Отмена</button></div></form>'
    );
  }

  function taskRow(state, task) {
    const student = state.students.filter(function (item) { return item.id === task.studentId; })[0];
    const curator = state.ui.role === "curator";
    const mine = state.ui.studentId === task.studentId;
    const mark = !curator && mine && !task.done
      ? '<button class="btn tiny primary" data-action="submit-task" data-id="' + task.id + '">Сдать</button>'
      : '<span class="note">' + (task.done ? "Сдано" : "Ждёт сдачи") + "</span>";
    const grade = curator
      ? '<input type="number" min="0" max="100" placeholder="Балл" value="' + esc(task.grade) + '" data-action="grade" data-id="' + task.id + '">'
      : '<span class="note">' + (task.grade === "" ? "—" : esc(task.grade)) + "</span>";
    return (
      '<div class="task' + (task.done ? " done" : "") + '">' +
        "<div><b>" + esc(task.title) + "</b><div class=\"note\">" + esc(student ? student.name : "") + " · " + esc(task.role) + "</div></div>" +
        mark + grade + "</div>"
    );
  }

  function page(state) {
    const project = projectOf(state);
    if (!project) return '<div class="tcontent"><p>Проектов пока нет.</p></div>';
    if (state.ui.role === "student") {
      const own = state.students.filter(function (student) { return student.id === state.ui.studentId; })[0];
      if (own && own.projectId !== project.id) state.ui.projectId = own.projectId;
    }
    const current = projectOf(state);
    const people = studentsOf(state, current.id);
    const iterations = iterationsOf(state, current.id);
    const tasks = iterations.reduce(function (all, iteration) { return all.concat(iteration.tasks); }, []);
    const done = tasks.filter(function (task) { return task.done; }).length;
    const percent = tasks.length ? Math.round(done * 100 / tasks.length) : 0;
    const notes = state.notifications.filter(function (note) {
      return note.studentId === state.ui.studentId && !note.read;
    });
    const banner = state.ui.role === "student" && notes.length
      ? '<div class="banner"><b>Напоминание</b><p>' + esc(notes[0].text) + '</p><button class="btn tiny" data-action="read-notes">Понятно</button></div>'
      : "";
    const options = state.projects.map(function (item) {
      return '<option value="' + item.id + '"' + (item.id === current.id ? " selected" : "") + ">" + esc(item.title) + "</option>";
    }).join("");
    const switcher = state.ui.role === "curator"
      ? '<select data-action="switch-project">' + options + "</select>"
      : "";
    const team = people.map(function (student) {
      return '<div class="person"><div><b>' + esc(student.name) + '</b><div class="note">' + esc(student.role) + "</div></div></div>";
    }).join("") || '<p class="note">Группа пустая. Соберите её в паспорте.</p>';
    const docs = iterations.map(function (iteration) {
      const ready = iteration.tasks.filter(function (task) { return task.done; }).length;
      return "<tr><td>" + esc(iteration.title) + "</td><td>" + iteration.tasks.length + "</td><td>" + ready + "</td></tr>";
    }).join("") || "<tr><td colspan=\"3\">Итераций пока нет</td></tr>";
    const blocks = iterations.map(function (iteration) {
      const waiting = iteration.tasks.filter(function (task) { return !task.done; }).length;
      const feedback = state.feedback.filter(function (item) { return item.iterationId === iteration.id; });
      const comments = feedback.map(function (item) {
        const student = state.students.filter(function (person) { return person.id === item.studentId; })[0];
        return "<p><b>" + esc(student ? student.name : "") + ".</b> " + esc(item.text) + "</p>";
      }).join("") || '<p class="note">Отзывов пока нет. Раньше они уходили в Excel.</p>';
      const canWrite = state.ui.role === "student";
      return (
        '<section class="card" id="grades"><h2>' + esc(iteration.title) + '</h2>' +
        '<p class="note">Срок ' + formatDate(iteration.due) + (waiting ? " · не сдали: " + waiting : " · все сдали") + "</p>" +
        iteration.tasks.map(function (task) { return taskRow(state, task); }).join("") +
        "<h3>Отзывы</h3>" + comments +
        (canWrite ? '<form class="inline" data-feedback="' + iteration.id + '"><input name="text" placeholder="Короткий отзыв по итерации"><button class="btn" type="submit">Сохранить отзыв</button></form>' : "") +
        "</section>"
      );
    }).join("");
    const tools = state.ui.role === "curator"
      ? '<div class="row-actions">' +
          '<button class="btn primary" data-action="from-template" data-id="' + current.id + '">Итерация из шаблона</button>' +
          '<button class="btn" data-action="copy-last" data-id="' + current.id + '">Копия прошлой</button>' +
          '<button class="btn" data-action="remind" data-id="' + current.id + '">Напомнить тем, кто не сдал</button>' +
          '<button class="btn" data-go="partner/passport/' + current.id + '">Паспорт на Партнёре</button>' +
        "</div>"
      : "";
    return (
      '<div class="tbar"><div>Список проектов / ' + esc(current.code) + " " + esc(current.title) + "</div>" + switcher + "</div>" +
      '<div class="tcontent">' + banner +
        '<div class="cards-3">' +
          '<section class="card"><h2>Команда</h2><p class="note">Куратор проекта</p><p><b>Анна Смирнова</b></p><p class="note">Заказчик</p><p>' + esc(current.customer) + '</p><h3>Участники: ' + people.length + "</h3>" + team + "</section>" +
          '<section class="card"><h2>Прогресс проекта</h2><p>' + done + " из " + tasks.length + " задач сдано</p><div class=\"bar\"><span style=\"width:" + percent + '%\"></span></div><p class="note">Срок ' + formatDate(current.deadline) + "</p></section>" +
          '<section class="card"><h2>Итерации</h2><table><tr><th>Итерация</th><th>Всего</th><th>Сдано</th></tr>' + docs + "</table></section>" +
        "</div>" +
        tools + draftPanel(state) + blocks +
      "</div>"
    );
  }

  function stub(state) {
    return '<div class="tcontent stub"><h1>' + esc(state.ui.stubTitle || "Раздел") + "</h1><p>В прототипе этот раздел не разбирался.</p></div>";
  }

  function render(state) {
    return '<div class="tlayout">' + sidebar(state) + '<div class="tmain">' + (state.ui.route === "stub" ? stub(state) : page(state)) + "</div></div>";
  }

  window.Team = { render: render };
})();
