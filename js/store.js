(function () {
  const KEY = "curator-prototype-v1";

  const TEMPLATES = {
    Аналитик: [
      "Собрать требования заказчика",
      "Описать сценарии пользователей",
      "Сверить результат с паспортом",
    ],
    Разработчик: [
      "Собрать рабочий экран",
      "Подключить данные итерации",
      "Проверить основной сценарий",
    ],
    Дизайнер: [
      "Собрать макет ключевых экранов",
      "Подготовить состояния интерфейса",
      "Сверить макет с паспортом",
    ],
    Тестировщик: [
      "Составить проверки по сценариям",
      "Проверить сборку итерации",
      "Зафиксировать замечания",
    ],
  };

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function isoPlus(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const parts = String(iso).split("-");
    if (parts.length !== 3) return String(iso);
    return parts[2] + "." + parts[1] + "." + parts[0];
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function seed() {
    return {
      projects: [
        {
          id: "p-draft",
          code: "778/ЛКП-8101-2026",
          title: "Учёт заявок на обслуживание оборудования",
          partner: "Екатеринбургский колледж техники",
          customer: "Орлова Елена Викторовна",
          program: "09.03.02 Информационные системы и технологии",
          type: "Прикладной (практико-ориентированный)",
          complexity: "Тип A. Известные методы и инструменты, типовой результат",
          address: "Екатеринбург, Мира, 19",
          status: "draft",
          studentsNeeded: 4,
          teams: 1,
          deadline: isoPlus(40),
          created: isoPlus(-10),
        },
        {
          id: "p-live",
          code: "778/ЛКП-8044-2026",
          title: "Защищённый обмен документами отдела",
          partner: "Городской центр информатизации",
          customer: "Павлов Игорь Сергеевич",
          program: "09.03.02 Информационные системы и технологии",
          type: "Прикладной (практико-ориентированный)",
          complexity: "Тип A. Известные методы и инструменты, типовой результат",
          address: "Екатеринбург, Ленина, 51",
          status: "approved",
          studentsNeeded: 3,
          teams: 1,
          deadline: isoPlus(4),
          created: isoPlus(-18),
        },
      ],
      students: [
        { id: "s1", name: "Ковалёв Артём", projectId: "p-live", role: "Разработчик" },
        { id: "s2", name: "Соколова Мария", projectId: "p-live", role: "Аналитик" },
      ],
      iterations: [
        {
          id: "i1",
          projectId: "p-live",
          title: "Итерация 1",
          due: isoPlus(4),
          tasks: [
            { id: "t1", studentId: "s2", role: "Аналитик", title: "Собрать требования заказчика", done: false, grade: "" },
            { id: "t2", studentId: "s2", role: "Аналитик", title: "Описать сценарии пользователей", done: true, grade: "90" },
            { id: "t3", studentId: "s1", role: "Разработчик", title: "Собрать рабочий экран", done: false, grade: "" },
          ],
        },
      ],
      notifications: [],
      feedback: [],
      ui: {
        site: "partner",
        route: "home",
        role: "curator",
        studentId: "s1",
        projectId: "p-draft",
        query: "",
        statusFilter: "all",
        notice: "",
        creating: false,
        draft: null,
        stubTitle: "",
      },
    };
  }

  function save(state) {
    const copy = JSON.parse(JSON.stringify(state));
    copy.ui.notice = "";
    localStorage.setItem(KEY, JSON.stringify(copy));
  }

  function reset() {
    const fresh = seed();
    save(fresh);
    return fresh;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const fresh = seed();
        save(fresh);
        return fresh;
      }
      const data = JSON.parse(raw);
      if (!data.ui || !data.students || !data.projects || !data.iterations) return reset();
      return data;
    } catch (error) {
      return reset();
    }
  }

  window.Store = {
    TEMPLATES: TEMPLATES,
    uid: uid,
    isoPlus: isoPlus,
    formatDate: formatDate,
    esc: esc,
    load: load,
    save: save,
    reset: reset,
  };
})();
