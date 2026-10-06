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
    const id = state.ui.projectId || "";
    function item(label, route, sub) {
      const active = state.ui.route === route ? " active" : "";
      return '<button class="' + (sub ? "sub" : "") + active + '" data-go="team/' + route + "/" + id + '">' + label + "</button>";
    }
    return (
      '<aside class="tside">' +
        item("О проекте", "project") +
        item("Задачи", "tasks") +
        item("Команда", "members") +
        '<button data-action="stub" data-title="Лента событий">Лента событий</button>' +
        '<button data-action="stub" data-title="Документы">Документы</button>' +
        '<button data-action="stub" data-title="Обсуждение">Обсуждение</button>' +
        item("Результаты и оценки", "grades") +
        item("Оценка по итерациям", "grades", true) +
      "</aside>"
    );
  }

  function options(list, current) {
    return list.map(function (value) {
      return '<option' + (value === current ? " selected" : "") + ">" + esc(value) + "</option>";
    }).join("");
  }

  function initials(name) {
    const parts = String(name || "").split(" ").filter(Boolean);
    return ((parts[0] || "").charAt(0) + (parts[1] || "").charAt(0)).toUpperCase();
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
      return "<tr><td>" + esc(iteration.title) + "</td><td>" + iteration.tasks.length + "</td><td>" + (iteration.published ? "Да" : "Нет") + "</td></tr>";
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
          '<section class="card"><h2>Документы</h2><table><tr><th>Итерация</th><th>Всего</th><th>Опубликовано заказчику</th></tr>' + docs + "</table></section>" +
        "</div>" +
        tools + draftPanel(state) + blocks +
        '<section class="card about"><h2>О проекте «' + esc(current.title) + "»</h2><table>" +
          row("Краткое название", current.title) +
          row("Уровень сложности", current.complexity) +
          row("Тип проводимых работ", current.type) +
          row("Цель", current.goal) +
          row("Требуемый результат", current.result) +
          row("Критерии оценки", current.criteria) +
          row("Организация заказчика", current.partner) +
          row("ФИО заказчика", current.customer) +
          row("Образовательная программа", current.program) +
          row("Период выполнения", current.period || "Осенний семестр 2026/2027 учебного года") +
        "</table></section></div>"
    );
  }

  function row(label, value) {
    return "<tr><th>" + esc(label) + "</th><td>" + esc(value || "—") + "</td></tr>";
  }

  function members(state) {
    const current = projectOf(state);
    const people = studentsOf(state, current.id);
    const curator = state.ui.role === "curator";
    const colors = ["#2f80ed", "#e25b5b", "#7b61ff", "#1aa6a6"];
    const rows = people.map(function (student, index) {
      const roleSelect = curator
        ? '<select data-action="set-team-role" data-id="' + student.id + '">' + options(window.Store.TEAM_ROLES, student.teamRole || "Не выбрано") + "</select>"
        : esc(student.teamRole || "—");
      const skillSelect = curator
        ? '<select data-action="set-competency" data-id="' + student.id + '">' + options(window.Store.COMPETENCIES, student.role || "Не выбрано") + "</select>"
        : esc(student.role || "—");
      const group = curator
        ? '<input data-action="set-group" data-id="' + student.id + '" value="' + esc(student.group || "") + '">'
        : esc(student.group || "—");
      return "<tr><td><span class=\"avatar\" style=\"background:" + colors[index % colors.length] + "\">" + esc(initials(student.name)) + "</span>" + esc(student.name) + "</td><td>" + group + "</td><td>" + roleSelect + "</td><td>" + skillSelect + "</td></tr>";
    }).join("");
    return (
      frame(state) +
      '<div class="tcontent"><section class="card"><h2>Команда проекта</h2>' +
      '<table class="team-table"><tr><th>Имя</th><th>Группа</th><th>Роль в команде</th><th>Компетентностная роль</th></tr>' +
      rows + "</table>" +
      (curator ? '<p class="note">Роль задаёт, какие задачи подставятся в итерацию.</p><p><button class="btn" data-go="team/tasks/' + current.id + '">Дальше: задачи</button></p>' : "") +
      "</section></div>"
    );
  }

  function frame(state) {
    const current = projectOf(state);
    const optionsHtml = state.projects.map(function (item) {
      return '<option value="' + item.id + '"' + (item.id === current.id ? " selected" : "") + ">" + esc(item.title) + "</option>";
    }).join("");
    const switcher = state.ui.role === "curator" ? '<select data-action="switch-project">' + optionsHtml + "</select>" : "";
    return '<div class="tbar"><div>Список проектов / ' + esc(current.code) + " " + esc(current.title) + "</div>" + switcher + "</div>";
  }

  function tasksPage(state) {
    const current = projectOf(state);
    const people = studentsOf(state, current.id);
    const iterations = iterationsOf(state, current.id);
    const curator = state.ui.role === "curator";
    const notes = state.notifications.filter(function (note) { return note.studentId === state.ui.studentId && !note.read; });
    const banner = state.ui.role === "student" && notes.length
      ? '<div class="banner"><b>Напоминание</b><p>' + esc(notes[0].text) + '</p><button class="btn tiny" data-action="read-notes">Понятно</button></div>'
      : "";
    const studentOptions = people.map(function (student) {
      return '<option value="' + student.id + '">' + esc(student.name) + " · " + esc(student.role || "роль не выбрана") + "</option>";
    }).join("");
    const iterationOptions = iterations.map(function (iteration) {
      return '<option value="' + iteration.id + '">' + esc(iteration.title) + "</option>";
    }).join("");
    const forms = curator
      ? '<section class="card"><h2>1. Итерация</h2><form id="new-iteration" class="inline">' +
          '<label class="field">Название<input name="title" placeholder="Итерация 2" required></label>' +
          '<label class="field">Срок<input name="due" type="date" value="' + esc(window.Store.isoPlus(7)) + '"></label>' +
          '<button class="btn primary" type="submit">Создать итерацию</button></form></section>' +
        '<section class="card"><h2>2. Задача</h2>' +
          (iterations.length ? '<form id="add-task" class="inline">' +
            '<label class="field">Текст<input name="title" placeholder="Что сделать за эту неделю" required></label>' +
            '<label class="field">Студент<select name="studentId">' + studentOptions + "</select></label>" +
            '<label class="field">Итерация<select name="iterationId">' + iterationOptions + "</select></label>" +
            '<button class="btn primary" type="submit">Добавить задачу</button></form>' +
            '<div class="row-actions"><button class="btn" data-action="fill-roles" data-id="' + iterations[iterations.length - 1].id + '">Подставить задачи по ролям</button>' +
            '<button class="btn" data-action="publish" data-id="' + iterations[iterations.length - 1].id + '">Опубликовать заказчику</button>' +
            '<button class="btn" data-action="remind" data-id="' + current.id + '">Напомнить тем, кто не сдал</button></div>'
          : '<p class="note">Сначала создайте итерацию.</p>') +
        "</section>"
      : "";
    const blocks = iterations.map(function (iteration) {
      const visible = curator ? iteration.tasks : iteration.tasks.filter(function (task) { return task.studentId === state.ui.studentId; });
      return '<section class="card"><h2>' + esc(iteration.title) + "</h2><p class=\"note\">Срок " + formatDate(iteration.due) + (iteration.published ? " · опубликовано заказчику" : "") + "</p>" +
        (visible.length ? visible.map(function (task) { return taskRow(state, task); }).join("") : '<p class="note">Задач пока нет.</p>') +
        "</section>";
    }).join("");
    return frame(state) + '<div class="tcontent">' + banner +
      '<div class="cycle"><span>1. Роли</span><span>2. Итерация</span><span>3. Задачи</span><span>4. Сдача</span><span>5. Балл</span><span>6. Публикация</span></div>' +
      forms + blocks + "</div>";
  }

  function stub(state) {
    return '<div class="tcontent stub"><h1>' + esc(state.ui.stubTitle || "Раздел") + "</h1><p>В прототипе этот раздел не разбирался.</p></div>";
  }

  function render(state) {
    let body = page(state);
    if (state.ui.route === "stub") body = stub(state);
    else if (state.ui.route === "members") body = members(state);
    else if (state.ui.route === "tasks" || state.ui.route === "grades") body = tasksPage(state);
    return '<div class="tlayout">' + sidebar(state) + '<div class="tmain">' + body + "</div></div>";
  }

  window.Team = { render: render };
})();
