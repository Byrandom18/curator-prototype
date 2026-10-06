(function () {
  let state = window.Store.load();
  let ignoreHash = false;
  let noticeTimer = 0;

  function buildHash() {
    const ui = state.ui;
    const needsId = ui.route === "passport" || ui.route === "project" || ui.route === "tasks" || ui.route === "grades" || ui.route === "members";
    return "#/" + ui.site + "/" + ui.route + (needsId && ui.projectId ? "/" + ui.projectId : "");
  }

  function applyHash() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    if (parts[0] === "partner" || parts[0] === "team") state.ui.site = parts[0];
    if (parts[1]) state.ui.route = parts[1];
    if (parts[2]) state.ui.projectId = parts[2];
  }

  function go(partial) {
    Object.keys(partial).forEach(function (key) { state.ui[key] = partial[key]; });
    window.Store.save(state);
    const hash = buildHash();
    if (location.hash !== hash) {
      ignoreHash = true;
      location.hash = hash;
    }
    render();
  }

  function showNotice(text) {
    state.ui.notice = text;
    render();
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () {
      state.ui.notice = "";
      render();
    }, 2600);
  }

  function projectById(id) {
    return state.projects.filter(function (project) { return project.id === id; })[0];
  }

  function render() {
    document.getElementById("demo").innerHTML = demoBar();
    document.getElementById("app").innerHTML = state.ui.site === "team" ? window.Team.render(state) : window.Partner.render(state);
    document.getElementById("toast").textContent = state.ui.notice || "";
    document.getElementById("toast").hidden = !state.ui.notice;
  }

  function demoBar() {
    function seg(action, value, label) {
      const current = action === "site" ? state.ui.site : state.ui.role;
      return '<button data-action="' + action + '" data-value="' + value + '" class="' + (current === value ? "active" : "") + '">' + label + "</button>";
    }
    const studentOptions = state.students.map(function (student) {
      return '<option value="' + student.id + '"' + (student.id === state.ui.studentId ? " selected" : "") + ">" + window.Store.esc(student.name) + "</option>";
    }).join("");
    const picker = state.ui.role === "student"
      ? '<select data-action="pick-student">' + studentOptions + "</select>"
      : "";
    return (
      "<b>Прототип куратора</b>" +
      '<div class="seg">' + seg("site", "partner", "Партнёр") + seg("site", "team", "TeamProject") + "</div>" +
      '<div class="seg">' + seg("role", "curator", "Куратор") + seg("role", "student", "Студент") + "</div>" +
      picker +
      '<span class="hint">Срок, группа, шаблон итерации и напоминание сохраняются в браузере.</span>' +
      '<span class="spacer"></span>' +
      '<button class="btn-reset" data-action="reset">Сбросить демо</button>'
    );
  }

  function readForm(id) {
    const form = document.getElementById(id);
    return form ? new FormData(form) : null;
  }

  function savePassport(id) {
    const project = projectById(id);
    const data = readForm("passport-form");
    if (!project || !data) return;
    project.title = data.get("title") || project.title;
    project.partner = data.get("partner") || "";
    project.customer = data.get("customer") || "";
    project.program = data.get("program") || "";
    project.type = data.get("type") || "";
    project.complexity = data.get("complexity") || "";
    project.address = data.get("address") || "";
    project.teams = Number(data.get("teams") || project.teams);
    project.studentsNeeded = Number(data.get("studentsNeeded") || project.studentsNeeded);
    project.deadline = data.get("deadline") || project.deadline;
    syncDue(project);
    window.Store.save(state);
    showNotice("Таблица паспорта сохранена");
  }

  function syncDue(project) {
    const iterations = state.iterations.filter(function (iteration) { return iteration.projectId === project.id; });
    if (iterations.length) iterations[iterations.length - 1].due = project.deadline;
  }

  function buildDraft(projectId, copy) {
    const people = state.students.filter(function (student) { return student.projectId === projectId; });
    if (!people.length) {
      showNotice("Сначала соберите группу в паспорте");
      go({ site: "partner", route: "passport", projectId: projectId });
      return;
    }
    const previous = state.iterations.filter(function (iteration) { return iteration.projectId === projectId; });
    let tasks = [];
    if (copy && previous.length) {
      tasks = previous[previous.length - 1].tasks.map(function (task) {
        return { studentId: task.studentId, role: task.role, title: task.title };
      });
    } else {
      people.forEach(function (student) {
        const lines = window.Store.TEMPLATES[student.role] || ["Выполнить задачи роли «" + student.role + "»"];
        lines.forEach(function (title) { tasks.push({ studentId: student.id, role: student.role, title: title }); });
      });
    }
    state.ui.draft = {
      projectId: projectId,
      title: copy ? "Итерация " + (previous.length + 1) + ". Продолжение" : "Итерация " + (previous.length + 1),
      due: window.Store.isoPlus(7),
      tasks: tasks,
    };
    window.Store.save(state);
    render();
  }

  function commitDraft() {
    const draft = state.ui.draft;
    const form = document.getElementById("draft-form");
    if (!draft || !form) return;
    const data = new FormData(form);
    form.querySelectorAll("[data-draft-index]").forEach(function (input) {
      draft.tasks[Number(input.getAttribute("data-draft-index"))].title = input.value;
    });
    state.iterations.push({
      id: window.Store.uid(),
      projectId: draft.projectId,
      title: data.get("title") || draft.title,
      due: data.get("due") || draft.due,
      tasks: draft.tasks.map(function (task) {
        return { id: window.Store.uid(), studentId: task.studentId, role: task.role, title: task.title, done: false, grade: "" };
      }),
      published: false,
    });
    const project = projectById(draft.projectId);
    if (project) project.deadline = data.get("due") || draft.due;
    state.ui.draft = null;
    window.Store.save(state);
    showNotice("Итерация создана из шаблона");
  }

  function onClick(event) {
    const el = event.target.closest("[data-action], [data-go]");
    if (!el) return;
    if (el.dataset.go) {
      const parts = el.dataset.go.split("/");
      go({ site: parts[0], route: parts[1], projectId: parts[2] || state.ui.projectId });
      return;
    }
    const action = el.dataset.action;
    if (action === "site") {
      go({ site: el.dataset.value, route: el.dataset.value === "team" ? "project" : "home" });
    } else if (action === "role") {
      const role = el.dataset.value;
      const student = state.students.filter(function (item) { return item.id === state.ui.studentId; })[0];
      go({
        role: role,
        site: role === "student" ? "team" : state.ui.site,
        route: role === "student" ? "tasks" : state.ui.route,
        projectId: role === "student" && student ? student.projectId : state.ui.projectId,
      });
    } else if (action === "reset") {
      if (!confirm("Вернуть исходные демонстрационные данные?")) return;
      state = window.Store.reset();
      ignoreHash = true;
      location.hash = "#/partner/home";
      showNotice("Демонстрационные данные восстановлены");
    } else if (action === "toggle-create") {
      state.ui.creating = !state.ui.creating;
      window.Store.save(state);
      render();
    } else if (action === "clear-filters") {
      state.ui.query = "";
      state.ui.statusFilter = "all";
      window.Store.save(state);
      render();
    } else if (action === "stub") {
      go({ route: "stub", stubTitle: el.dataset.title || "Раздел", site: state.ui.site });
    } else if (action === "open-overdue") {
      const iteration = state.iterations.filter(function (item) {
        return item.tasks.some(function (task) { return !task.done; });
      })[0];
      go({ site: "team", route: "project", projectId: iteration ? iteration.projectId : state.ui.projectId });
    } else if (action === "send-partner") {
      const project = projectById(el.dataset.id);
      if (project) project.status = "partner";
      window.Store.save(state);
      showNotice("Паспорт у партнёра. Университетский круг для этого шага не нужен");
    } else if (action === "confirm-partner") {
      const project = projectById(el.dataset.id);
      if (project) project.status = "approved";
      window.Store.save(state);
      showNotice("Партнёр подтвердил паспорт");
    } else if (action === "extend") {
      savePassport(el.dataset.id);
      showNotice("Срок продлён и сразу виден в TeamProject");
    } else if (action === "remove-student") {
      const id = el.dataset.id;
      state.students = state.students.filter(function (student) { return student.id !== id; });
      state.iterations.forEach(function (iteration) {
        iteration.tasks = iteration.tasks.filter(function (task) { return task.studentId !== id; });
      });
      state.notifications = state.notifications.filter(function (note) { return note.studentId !== id; });
      window.Store.save(state);
      render();
    } else if (action === "from-template") {
      buildDraft(el.dataset.id, false);
    } else if (action === "copy-last") {
      buildDraft(el.dataset.id, true);
    } else if (action === "fill-roles") {
      const iteration = state.iterations.filter(function (item) { return item.id === el.dataset.id; })[0];
      if (!iteration) return;
      const people = state.students.filter(function (student) { return student.projectId === iteration.projectId; });
      people.forEach(function (student) {
        const lines = window.Store.TEMPLATES[student.role] || [];
        lines.forEach(function (title) {
          const exists = iteration.tasks.some(function (task) { return task.studentId === student.id && task.title === title; });
          if (!exists) iteration.tasks.push({ id: window.Store.uid(), studentId: student.id, role: student.role, title: title, done: false, grade: "" });
        });
      });
      window.Store.save(state);
      showNotice("Задачи добавлены по компетентностным ролям");
    } else if (action === "publish") {
      const iteration = state.iterations.filter(function (item) { return item.id === el.dataset.id; })[0];
      if (!iteration) return;
      iteration.published = true;
      window.Store.save(state);
      showNotice("Итерация опубликована заказчику");
    } else if (action === "remove-task") {
      state.iterations.forEach(function (iteration) {
        iteration.tasks = iteration.tasks.filter(function (task) { return task.id !== el.dataset.id; });
      });
      window.Store.save(state);
      render();
    } else if (action === "cancel-draft") {
      state.ui.draft = null;
      window.Store.save(state);
      render();
    } else if (action === "drop-draft-task") {
      state.ui.draft.tasks.splice(Number(el.dataset.index), 1);
      render();
    } else if (action === "remind") {
      const iteration = state.iterations.filter(function (item) { return item.projectId === el.dataset.id; }).slice(-1)[0];
      if (!iteration) {
        showNotice("Сначала создайте итерацию");
        return;
      }
      const pending = {};
      iteration.tasks.forEach(function (task) { if (!task.done) pending[task.studentId] = true; });
      const ids = Object.keys(pending);
      ids.forEach(function (studentId) {
        state.notifications.push({
          id: window.Store.uid(),
          studentId: studentId,
          text: "Отметьте сдачу по «" + iteration.title + "» до " + window.Store.formatDate(iteration.due) + ".",
          read: false,
        });
      });
      window.Store.save(state);
      showNotice(ids.length ? "Напоминание отправлено: " + ids.length : "Все задачи этой итерации уже сданы");
    } else if (action === "submit-task") {
      const taskId = el.dataset.id;
      state.iterations.forEach(function (iteration) {
        iteration.tasks.forEach(function (task) {
          if (task.id === taskId) task.done = true;
        });
      });
      window.Store.save(state);
      showNotice("Сдача отмечена");
    } else if (action === "read-notes") {
      state.notifications.forEach(function (note) {
        if (note.studentId === state.ui.studentId) note.read = true;
      });
      window.Store.save(state);
      render();
    } else if (action === "focus-grades") {
      go({ site: "team", route: "project", projectId: state.ui.projectId });
      const node = document.getElementById("grades");
      if (node) node.scrollIntoView();
    }
  }

  function onChange(event) {
    const el = event.target;
    if (el.dataset.action === "filter") {
      state.ui.statusFilter = el.value;
      window.Store.save(state);
      render();
    } else if (el.dataset.action === "pick-student") {
      const student = state.students.filter(function (item) { return item.id === el.value; })[0];
      go({ studentId: el.value, projectId: student ? student.projectId : state.ui.projectId, site: "team", route: "project" });
    } else if (el.dataset.action === "switch-project") {
      go({ projectId: el.value, site: "team", route: state.ui.route === "home" ? "project" : state.ui.route });
    } else if (el.dataset.action === "set-team-role" || el.dataset.action === "set-competency") {
      const student = state.students.filter(function (item) { return item.id === el.dataset.id; })[0];
      if (!student) return;
      if (el.dataset.action === "set-team-role") student.teamRole = el.value;
      else student.role = el.value;
      window.Store.save(state);
    } else if (el.dataset.action === "grade") {
      state.iterations.forEach(function (iteration) {
        iteration.tasks.forEach(function (task) {
          if (task.id === el.dataset.id) task.grade = el.value;
        });
      });
      window.Store.save(state);
      showNotice("Балл сохранён");
    }
  }

  function onInput(event) {
    const el = event.target;
    if (el.id === "search") {
      state.ui.query = el.value;
      const box = document.getElementById("application-cards");
      const count = document.getElementById("application-count");
      if (box) box.innerHTML = window.Partner.cards(state);
      if (count) count.textContent = String(window.Partner.visible(state).length);
    } else if (el.dataset.action === "set-group") {
      const student = state.students.filter(function (item) { return item.id === el.dataset.id; })[0];
      if (student) student.group = el.value;
      window.Store.save(state);
    } else if (el.dataset.draftIndex != null && state.ui.draft) {
      state.ui.draft.tasks[Number(el.dataset.draftIndex)].title = el.value;
    }
  }

  function onSubmit(event) {
    const form = event.target;
    if (form.id === "passport-form") {
      event.preventDefault();
      savePassport(state.ui.projectId);
    } else if (form.id === "new-project") {
      event.preventDefault();
      const data = new FormData(form);
      const project = {
        id: window.Store.uid(),
        code: "778/ЛКП-" + (9002 + state.projects.length) + "-2026",
        title: data.get("title") || "Новый проект",
        partner: data.get("partner") || "Партнёр",
        customer: data.get("customer") || "Заказчик",
        program: "09.03.02 Информационные системы и технологии",
        type: "Прикладной (практико-ориентированный)",
        complexity: "Тип A. Известные методы и инструменты, типовой результат",
        address: "Екатеринбург",
        status: "draft",
        studentsNeeded: Number(data.get("studentsNeeded") || 3),
        teams: 1,
        deadline: window.Store.isoPlus(14),
        created: window.Store.isoPlus(0),
      };
      state.projects.push(project);
      state.ui.creating = false;
      window.Store.save(state);
      go({ site: "partner", route: "passport", projectId: project.id });
      showNotice("Заявка создана. Можно заполнить паспорт");
    } else if (form.id === "add-student") {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      if (!name) return;
      state.students.push({
        id: window.Store.uid(),
        name: name,
        projectId: state.ui.projectId,
        group: data.get("group") || "",
        teamRole: data.get("teamRole") || "Участник",
        role: data.get("role") || "Не выбрано",
      });
      window.Store.save(state);
      showNotice(name + " добавлен в группу");
    } else if (form.id === "new-iteration") {
      event.preventDefault();
      const data = new FormData(form);
      const title = String(data.get("title") || "").trim();
      if (!title) return;
      state.iterations.push({
        id: window.Store.uid(),
        projectId: state.ui.projectId,
        title: title,
        due: data.get("due") || window.Store.isoPlus(7),
        published: false,
        tasks: [],
      });
      const project = projectById(state.ui.projectId);
      if (project && data.get("due")) project.deadline = data.get("due");
      window.Store.save(state);
      showNotice("Итерация создана. Можно добавлять задачи");
    } else if (form.id === "add-task") {
      event.preventDefault();
      const data = new FormData(form);
      const iteration = state.iterations.filter(function (item) { return item.id === data.get("iterationId"); })[0];
      const student = state.students.filter(function (item) { return item.id === data.get("studentId"); })[0];
      const title = String(data.get("title") || "").trim();
      if (!iteration || !title) {
        showNotice("Сначала создайте итерацию и напишите задачу");
        return;
      }
      iteration.tasks.push({
        id: window.Store.uid(),
        studentId: student ? student.id : "",
        role: student ? student.role : "",
        title: title,
        done: false,
        grade: "",
      });
      window.Store.save(state);
      showNotice("Задача добавлена");
    } else if (form.id === "draft-form") {
      event.preventDefault();
      commitDraft();
    } else if (form.dataset.feedback) {
      event.preventDefault();
      const text = String(new FormData(form).get("text") || "").trim();
      if (!text) return;
      state.feedback.push({ id: window.Store.uid(), iterationId: form.dataset.feedback, studentId: state.ui.studentId, text: text });
      window.Store.save(state);
      showNotice("Отзыв сохранён в проекте");
    }
  }

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("submit", onSubmit);
  window.addEventListener("hashchange", function () {
    if (ignoreHash) {
      ignoreHash = false;
      return;
    }
    applyHash();
    render();
  });

  if (!location.hash || location.hash === "#") {
    ignoreHash = true;
    location.hash = buildHash();
  } else {
    applyHash();
  }
  render();
})();
