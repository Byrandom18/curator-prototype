(function () {
  const esc = function (value) { return window.Store.esc(value); };
  const formatDate = function (value) { return window.Store.formatDate(value); };

  function statusBadge(status) {
    if (status === "approved") return '<span class="badge">Принята</span>';
    if (status === "partner") return '<span class="badge wait">На рассмотрении</span>';
    return '<span class="badge draft">Черновик</span>';
  }

  function visible(state) {
    const query = (state.ui.query || "").trim().toLowerCase();
    return state.projects.filter(function (project) {
      if (state.ui.statusFilter !== "all" && project.status !== state.ui.statusFilter) return false;
      if (!query) return true;
      return (project.title + project.partner + project.customer + project.code).toLowerCase().indexOf(query) !== -1;
    });
  }

  function enrolled(state, projectId) {
    return state.students.filter(function (student) { return student.projectId === projectId; }).length;
  }

  function openTasks(state) {
    return state.iterations.reduce(function (sum, iteration) {
      return sum + iteration.tasks.filter(function (task) { return !task.done; }).length;
    }, 0);
  }

  function cards(state) {
    const list = visible(state);
    if (!list.length) return '<p class="muted">Заявок с таким фильтром нет.</p>';
    return list.map(function (project) {
      return (
        '<article class="card">' +
          '<div style="display:flex;justify-content:space-between;gap:8px">' +
            '<span class="muted">Заявка №' + esc(project.code) + " от " + formatDate(project.created) + "</span>" +
            statusBadge(project.status) +
          "</div>" +
          '<button class="app-title" data-go="partner/passport/' + esc(project.id) + '">' + esc(project.title) + "</button>" +
          '<p class="meta"><span class="muted">Партнёр</span><br>' + esc(project.partner) + "</p>" +
          '<p class="meta"><span class="muted">Заказчик</span><br>' + esc(project.customer) + "</p>" +
          '<p class="note">В группе ' + enrolled(state, project.id) + " из " + esc(project.studentsNeeded) + "</p>" +
        "</article>"
      );
    }).join("");
  }

  function sidebar(state) {
    function item(route, label, sub) {
      const active = state.ui.route === route ? " active" : "";
      const cls = sub ? "sub-item" : "nav-item";
      return '<button class="' + cls + active + '" data-go="partner/' + route + '">' + label + "</button>";
    }
    return (
      '<aside class="pside">' +
        item("home", "Главная страница") +
        '<div class="nav-label">Проектное обучение</div>' +
        item("applications", "Заявки", true) +
        item("passports", "Паспорта", true) +
        '<button class="sub-item" data-action="stub" data-title="Реализуемые проекты">Реализуемые проекты</button>' +
        '<button class="sub-item" data-action="stub" data-title="Реестр экспертов">Реестр экспертов</button>' +
        '<button class="sub-item" data-action="stub" data-title="Студенты">Студенты</button>' +
        '<button class="nav-item" data-action="stub" data-title="Практика">Практика</button>' +
        '<button class="nav-item" data-action="stub" data-title="Мероприятия">Мероприятия</button>' +
      "</aside>"
    );
  }

  function header(state) {
    const name = state.ui.role === "curator"
      ? "Анна Смирнова"
      : (state.students.filter(function (student) { return student.id === state.ui.studentId; })[0] || {}).name || "Студент";
    const count = openTasks(state);
    return (
      '<header class="phead">' +
        '<div class="logo">У</div>' +
        '<div class="org">ФГАОУ ВО «УрФУ имени первого Президента России Б.Н. Ельцина»</div>' +
        '<div class="spacer"></div>' +
        '<button class="bell" data-action="open-overdue" title="Несданные задачи">🔔' +
          (count ? "<span>" + count + "</span>" : "") +
        "</button>" +
        '<div class="userchip">' + esc(name) + "</div>" +
      "</header>"
    );
  }

  function home(state) {
    const needed = state.projects.reduce(function (sum, project) { return sum + Number(project.studentsNeeded || 0); }, 0);
    const rows = state.projects.map(function (project) {
      return (
        '<div class="project-row">' +
          "<div><h3>" + esc(project.title) + "</h3>" +
          '<div class="note">В группе ' + enrolled(state, project.id) + " из " + esc(project.studentsNeeded) + " · срок " + formatDate(project.deadline) + "</div></div>" +
          '<div class="row-actions">' +
            statusBadge(project.status) +
            '<button class="btn tiny" data-go="partner/passport/' + project.id + '">Паспорт</button>' +
            '<button class="btn tiny primary" data-go="team/project/' + project.id + '">TeamProject</button>' +
          "</div></div>"
      );
    }).join("");
    return (
      '<div class="page-head"><div><h1>Мои проекты</h1>' +
      '<div class="muted">Сводка, которую куратор раньше собирала по трём системам.</div></div></div>' +
      '<div class="stats">' +
        "<div class=\"stat\"><b>" + state.projects.length + "</b><span>проектов на кураторе</span></div>" +
        "<div class=\"stat\"><b>" + needed + "</b><span>студентов нужно</span></div>" +
        "<div class=\"stat\"><b>" + state.students.length + "</b><span>уже в группах</span></div>" +
        "<div class=\"stat\"><b>" + openTasks(state) + "</b><span>задач без сдачи</span></div>" +
      "</div>" +
      '<section class="card">' + rows + "</section>"
    );
  }

  function filters(state) {
    function line(value, label, dot) {
      const checked = state.ui.statusFilter === value ? " checked" : "";
      return '<label class="filter-line"><input type="radio" name="status" data-action="filter" value="' + value + '"' + checked + '><i class="dot ' + dot + '"></i>' + label + "</label>";
    }
    return (
      "<h3>Статус</h3>" +
      line("all", "Все заявки", "") +
      line("draft", "Черновик", "") +
      line("partner", "На рассмотрении", "orange") +
      line("approved", "Принятые", "green") +
      "<h3>Семестр</h3>" +
      '<p class="note">Осенний семестр 2026/2027</p>' +
      '<button class="btn" data-action="clear-filters">Очистить фильтры</button>'
    );
  }

  function createForm() {
    return (
      '<form class="card" id="new-project">' +
        "<h3>Новая заявка</h3>" +
        '<label class="field">Название<input name="title" required></label>' +
        '<label class="field">Партнёр<input name="partner"></label>' +
        '<label class="field">Заказчик<input name="customer"></label>' +
        '<label class="field">Сколько студентов нужно<input name="studentsNeeded" type="number" min="1" value="3"></label>' +
        '<button class="btn primary" type="submit">Создать и открыть паспорт</button>' +
      "</form>"
    );
  }

  function applications(state) {
    return (
      '<div class="page-head"><div><h1>Заявки</h1>' +
      '<div class="muted">Осенний семестр 2026/2027. Видны заявки, которые уже назначены куратору.</div></div>' +
      '<button class="btn primary" data-action="toggle-create">+ Подать новую заявку</button></div>' +
      (state.ui.creating ? createForm() : "") +
      '<section class="card"><div class="muted">Поиск</div>' +
      '<input class="search" id="search" placeholder="Поиск по заявкам" value="' + esc(state.ui.query) + '">' +
      '<div class="note">Всего заявок: <span id="application-count">' + visible(state).length + "</span></div></section>" +
      '<div id="application-cards">' + cards(state) + "</div>"
    );
  }

  function steps(project) {
    const stage = project.status === "approved" ? 3 : project.status === "partner" ? 2 : 1;
    function li(n, text) {
      return '<li class="' + (stage === n ? "on" : "") + '"><span class="num">' + n + "</span>" + text + "</li>";
    }
    return (
      "<h3>Прогресс паспорта</h3><ol class=\"steps\">" +
      li(1, "Формирование паспорта") +
      li(2, "На согласовании у партнёра") +
      li(3, "Паспорт утверждён") +
      "</ol><p class=\"note\">Отдельный круг согласования в университете для правок срока и таблицы не нужен: куратор сохраняет их сама.</p>"
    );
  }

  function people(state, project) {
    const list = state.students.filter(function (student) { return student.projectId === project.id; });
    const rows = list.length
      ? list.map(function (student) {
        return '<div class="person"><div><b>' + esc(student.name) + "</b><div class=\"note\">" + esc(student.role) + "</div></div>" +
          (state.ui.role === "curator" ? '<button class="btn tiny danger" data-action="remove-student" data-id="' + student.id + '">Убрать</button>' : "") +
          "</div>";
      }).join("")
      : '<p class="note">Группы ещё нет. Добавьте студентов здесь, без отдельного шага у руководителя.</p>';
    const form = state.ui.role === "curator"
      ? '<form id="add-student" class="inline">' +
          '<label class="field">Имя<input name="name" required></label>' +
          '<label class="field">Роль<select name="role"><option>Аналитик</option><option>Разработчик</option><option>Дизайнер</option><option>Тестировщик</option></select></label>' +
          '<button class="btn primary" type="submit">В группу</button></form>'
      : "";
    return "<h3>Группа " + list.length + " из " + esc(project.studentsNeeded) + "</h3>" + rows + form;
  }

  function field(name, label, value, disabled) {
    return '<label class="field">' + label + '<input name="' + name + '" value="' + esc(value) + '"' + (disabled ? " disabled" : "") + "></label>";
  }

  function passport(state) {
    const project = state.projects.filter(function (item) { return item.id === state.ui.projectId; })[0] || state.projects[0];
    if (!project) return "<p>Проектов пока нет.</p>";
    const readOnly = state.ui.role !== "curator";
    const send = project.status === "draft" && !readOnly
      ? '<button class="btn primary" type="button" data-action="send-partner" data-id="' + project.id + '">Отправить партнёру</button>'
      : "";
    const confirm = project.status === "partner" && !readOnly
      ? '<button class="btn primary" type="button" data-action="confirm-partner" data-id="' + project.id + '">Партнёр подтвердил</button><p class="note">В прототипе это кнопка вместо отдельного кабинета партнёра.</p>'
      : "";
    return (
      '<div class="page-head"><div><h1>Паспорт</h1><div class="muted">№' + esc(project.code) + "</div></div>" +
      '<button class="btn" data-go="team/project/' + project.id + '">Открыть в TeamProject</button></div>' +
      '<div class="grid-2"><form class="card" id="passport-form">' +
        field("title", "Название", project.title, readOnly) +
        field("partner", "Партнёр", project.partner, readOnly) +
        field("customer", "Заказчик", project.customer, readOnly) +
        field("program", "Образовательная программа", project.program, readOnly) +
        field("type", "Тип проекта", project.type, readOnly) +
        field("complexity", "Уровень сложности", project.complexity, readOnly) +
        field("address", "Адрес практической подготовки", project.address, readOnly) +
        '<div class="inline">' +
          '<label class="field">Команд<input name="teams" type="number" min="1" value="' + esc(project.teams) + '"' + (readOnly ? " disabled" : "") + "></label>" +
          '<label class="field">Студентов нужно<input name="studentsNeeded" type="number" min="1" value="' + esc(project.studentsNeeded) + '"' + (readOnly ? " disabled" : "") + "></label>" +
          '<label class="field">Срок итерации<input name="deadline" type="date" value="' + esc(project.deadline) + '"' + (readOnly ? " disabled" : "") + "></label>" +
        "</div>" +
        (readOnly ? "" : '<div class="row-actions"><button class="btn primary" type="submit">Сохранить таблицу</button><button class="btn" type="button" data-action="extend" data-id="' + project.id + '">Продлить срок</button></div>') +
        "<p class=\"note\">Сохранение и продление срока остаются у куратора.</p>" +
      "</form><div>" +
        '<section class="card">' + steps(project) + send + confirm + "</section>" +
        '<section class="card">' + people(state, project) + "</section>" +
      "</div></div>"
    );
  }

  function stub(state) {
    return '<div class="stub"><h1>' + esc(state.ui.stubTitle || "Раздел") + '</h1><p class="muted">В прототипе этот раздел не разбирался. Рабочие экраны: сводка, заявки, паспорт и TeamProject.</p></div>';
  }

  function render(state) {
    let body = home(state);
    let rail = "";
    let layout = "playout no-rail";
    if (state.ui.route === "applications" || state.ui.route === "passports") {
      body = applications(state);
      rail = filters(state);
      layout = "playout";
    } else if (state.ui.route === "passport") {
      body = passport(state);
      layout = "playout no-rail";
    } else if (state.ui.route === "stub") {
      body = stub(state);
    }
    return '<div class="partner">' + header(state) + '<div class="' + layout + '">' + sidebar(state) + '<div class="pmain">' + body + "</div>" + (rail ? '<aside class="prail">' + rail + "</aside>" : "") + "</div></div>";
  }

  window.Partner = { render: render, cards: cards, visible: visible };
})();
