/* =====================================================================
   ホシガネ精工アカデミー — アプリ本体
   ルーティング(#/dashboard, #/course/<id>, #/quiz/<id>, #/cert/<id>)
   進捗管理(localStorage) / 修了率 / 修了証 / プリセットシード
   fetch 不使用。window.COURSES（courses.js）と window.Quiz（quiz.js）を利用。
   ===================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "hoshigane_academy_progress";
  var COURSES = window.COURSES || [];
  var app = document.getElementById("app");

  /* ----------------------------- ユーティリティ ----------------------------- */
  function byId(id) {
    for (var i = 0; i < COURSES.length; i++) {
      if (COURSES[i].id === id) return COURSES[i];
    }
    return null;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function todayStr() {
    var d = new Date();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function fmtDate(s) {
    if (!s) return "";
    var p = s.split("-");
    if (p.length !== 3) return s;
    return p[0] + "年" + parseInt(p[1], 10) + "月" + parseInt(p[2], 10) + "日";
  }

  /* ----------------------------- 進捗ストア ----------------------------- */
  /* 形: { [courseId]: { status:'未受講'|'受講中'|'修了', score:Number|null, date:String|null } } */

  function defaultPreset() {
    // デモの肝: shinjin/safety/machining を「修了」でシード（60%）
    return {
      shinjin:  { status: "修了", score: 100, date: "2026-06-10" },
      safety:   { status: "修了", score: 80,  date: "2026-06-11" },
      machining:{ status: "修了", score: 100, date: "2026-06-12" },
      measure:  { status: "未受講", score: null, date: null },
      packing:  { status: "未受講", score: null, date: null }
    };
  }

  function ensureAllCourses(state) {
    // COURSES に存在する全コースのキーを保証する
    COURSES.forEach(function (c) {
      if (!state[c.id]) state[c.id] = { status: "未受講", score: null, date: null };
    });
    return state;
  }

  function loadProgress() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (!raw) {
      // 初回ロード: プリセットをシードして保存
      var seeded = ensureAllCourses(defaultPreset());
      saveProgress(seeded);
      return seeded;
    }
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    if (!parsed || typeof parsed !== "object") {
      var fallback = ensureAllCourses(defaultPreset());
      saveProgress(fallback);
      return fallback;
    }
    return ensureAllCourses(parsed);
  }

  function saveProgress(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* file:// でも握りつぶす */ }
  }

  function resetProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    var seeded = ensureAllCourses(defaultPreset());
    saveProgress(seeded);
    return seeded;
  }

  function getCourseState(id) {
    var state = loadProgress();
    return state[id] || { status: "未受講", score: null, date: null };
  }

  function setStatus(id, status) {
    var state = loadProgress();
    if (!state[id]) state[id] = { status: "未受講", score: null, date: null };
    // 修了済みを「受講中」に格下げしない
    if (state[id].status === "修了" && status === "受講中") return;
    state[id].status = status;
    saveProgress(state);
  }

  function markComplete(id, score) {
    var state = loadProgress();
    if (!state[id]) state[id] = {};
    state[id].status = "修了";
    state[id].score = score;
    state[id].date = todayStr();
    saveProgress(state);
  }

  function completionStats() {
    var state = loadProgress();
    var done = 0;
    COURSES.forEach(function (c) {
      if (state[c.id] && state[c.id].status === "修了") done++;
    });
    var total = COURSES.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    return { done: done, total: total, pct: pct };
  }

  /* ----------------------------- 共通パーツ ----------------------------- */
  function regCorners() {
    return '<span class="reg reg-tl"></span><span class="reg reg-tr"></span>' +
           '<span class="reg reg-bl"></span><span class="reg reg-br"></span>';
  }
  function typeLabel(c) { return c.material.type === "video" ? "動画" : "スライド"; }

  /* ----------------------------- ダッシュボード ----------------------------- */
  function renderDashboard() {
    var stats = completionStats();
    var state = loadProgress();

    // 円形リング（半径70, 円周 ≈ 439.82）
    var R = 70;
    var C = 2 * Math.PI * R;
    var offset = C * (1 - stats.pct / 100);
    var ringDone = stats.pct >= 100 ? " complete" : "";

    var cards = COURSES.map(function (c, idx) {
      var st = state[c.id] || { status: "未受講" };
      var status = st.status || "未受講";
      var isDone = status === "修了";
      var no = "COURSE " + ("0" + (idx + 1)).slice(-2);
      var btnLabel = isDone ? "復習する" : (status === "受講中" ? "続きから" : "受講する");
      var btnClass = isDone ? "btn-outline" : "btn";
      var fillClass = isDone ? "card-progress-fill done" : "card-progress-fill";
      var pctText = isDone ? "100%" : (status === "受講中" ? "受講中" : "0%");

      return '' +
      '<article class="course-card' + (isDone ? " is-done" : "") + '">' +
        regCorners() +
        '<div class="card-top">' +
          '<span class="course-no">' + no + '</span>' +
          '<span class="badges">' +
            '<span class="badge badge-type">' + typeLabel(c) + '</span>' +
            '<span class="badge badge-status-' + status + '">' + status + '</span>' +
          '</span>' +
        '</div>' +
        '<h3>' + esc(c.title) + '</h3>' +
        '<p class="course-subtitle">' + esc(c.subtitle) + '</p>' +
        '<div class="card-progress">' +
          '<div class="card-progress-bar"><div class="' + fillClass + '" style="width:' +
            (isDone ? "100%" : (status === "受講中" ? "45%" : "0%")) + '"></div></div>' +
          '<div class="card-progress-meta">' +
            '<span>' + (isDone ? '<span class="card-done-flag">修了</span>' : pctText) + '</span>' +
            '<span>' + (isDone && st.score != null ? ("スコア " + st.score + "%") : ("全5問テスト")) + '</span>' +
          '</div>' +
        '</div>' +
        '<a class="btn ' + btnClass + ' btn-block btn-sm" href="#/course/' + c.id + '">' + btnLabel + '</a>' +
      '</article>';
    }).join("");

    app.innerHTML = '' +
    '<section class="view">' +
      '<div class="dash-hero">' +
        '<div class="progress-ring">' +
          '<svg width="180" height="180" viewBox="0 0 180 180">' +
            '<circle class="ring-bg" cx="90" cy="90" r="' + R + '"></circle>' +
            '<circle class="ring-fg' + ringDone + '" cx="90" cy="90" r="' + R + '" ' +
              'stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '"></circle>' +
          '</svg>' +
          '<div class="progress-ring-label">' +
            '<div class="progress-ring-pct">' + stats.pct + '%</div>' +
            '<div class="progress-ring-cap">全体修了率</div>' +
          '</div>' +
        '</div>' +
        '<div class="dash-hero-text">' +
          '<h1>永井蒼汰さんの学習状況</h1>' +
          '<p>製造部 旋盤課 ／ 入社3ヶ月目。下のコースを受講し、確認テストに合格すると修了になります。</p>' +
          '<div class="dash-stat-line">修了コース <strong>' + stats.done + '</strong> / ' + stats.total + ' コース</div>' +
        '</div>' +
      '</div>' +
      '<p class="section-label">研修コース一覧</p>' +
      '<div class="course-grid">' + cards + '</div>' +
    '</section>';
  }

  /* ----------------------------- 受講画面 ----------------------------- */
  function renderCourse(id) {
    var c = byId(id);
    if (!c) return renderNotFound();

    // 受講画面に来たら未受講→受講中に更新
    if (getCourseState(id).status === "未受講") setStatus(id, "受講中");

    var materialHtml;
    if (c.material.type === "video") {
      var stepImg = (c.material.slides && c.material.slides[0]) || "";
      materialHtml =
        '<div class="material-wrap">' +
          '<video class="material-video" controls preload="metadata" playsinline src="' + esc(c.material.video) + '">' +
            'お使いのブラウザは動画再生に対応していません。' +
          '</video>' +
          '<p class="material-caption">新入社員研修 オリエンテーション動画。再生して内容を確認してください。</p>' +
          (stepImg ?
            '<div class="video-step-figure">' +
              '<h4>育成ステップ図（3ヶ月の流れ）</h4>' +
              '<img class="figure-img" src="' + esc(stepImg) + '" alt="新人育成ステップ図">' +
            '</div>' : "") +
        '</div>';
    } else {
      // スライドビューア
      var slides = c.material.slides || [];
      materialHtml =
        '<div class="material-wrap slide-viewer" id="slideViewer" data-total="' + slides.length + '">' +
          '<p class="slides-heading">教材スライド</p>' +
          '<div class="slide-stage">' +
            '<img class="slide-img" id="slideImg" src="' + esc(slides[0]) + '" alt="教材スライド 1">' +
          '</div>' +
          '<div class="slide-dots" id="slideDots"></div>' +
          '<div class="slide-controls">' +
            '<button class="btn btn-outline btn-sm" id="slidePrev" disabled>← 前へ</button>' +
            '<span class="slide-counter" id="slideCounter">1 / ' + slides.length + '</span>' +
            '<button class="btn btn-sm" id="slideNext">次へ →</button>' +
          '</div>' +
          '<p class="read-hint" id="slideHint">最後のスライドまで確認したら、確認テストに進めます。</p>' +
        '</div>';
    }

    app.innerHTML = '' +
    '<section class="view">' +
      '<div class="breadcrumb"><a href="#/dashboard">ダッシュボード</a> &rsaquo; ' + esc(c.title) + '</div>' +
      '<h1 class="page-title">' + esc(c.title) + '</h1>' +
      '<p class="page-sub">' + esc(c.subtitle) + '</p>' +
      materialHtml +
      '<div class="proceed-bar">' +
        '<a class="btn btn-ghost btn-sm" href="#/dashboard">ダッシュボードに戻る</a>' +
        '<a class="btn btn-green btn-lg" href="#/quiz/' + c.id + '">確認テストに進む →</a>' +
      '</div>' +
    '</section>';

    if (c.material.type === "slides") setupSlideViewer(c.material.slides || []);
  }

  function setupSlideViewer(slides) {
    var idx = 0;
    var seen = {};
    seen[0] = true;
    var img = document.getElementById("slideImg");
    var counter = document.getElementById("slideCounter");
    var prev = document.getElementById("slidePrev");
    var next = document.getElementById("slideNext");
    var dotsWrap = document.getElementById("slideDots");

    // ドット生成
    dotsWrap.innerHTML = slides.map(function (_, i) {
      return '<button class="slide-dot' + (i === 0 ? " active" : "") + '" data-i="' + i + '" aria-label="スライド ' + (i + 1) + '"></button>';
    }).join("");

    function update() {
      img.src = slides[idx];
      img.alt = "教材スライド " + (idx + 1);
      counter.textContent = (idx + 1) + " / " + slides.length;
      prev.disabled = (idx === 0);
      // 最後のスライドまで来たら次へボタンを終端表示
      if (idx === slides.length - 1) {
        next.textContent = "最後のスライド";
        next.disabled = true;
        next.classList.add("btn-outline");
      } else {
        next.textContent = "次へ →";
        next.disabled = false;
        next.classList.remove("btn-outline");
      }
      // ドット状態
      Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
        d.classList.toggle("active", i === idx);
        d.classList.toggle("seen", !!seen[i] && i !== idx);
      });
    }

    prev.addEventListener("click", function () {
      if (idx > 0) { idx--; seen[idx] = true; update(); }
    });
    next.addEventListener("click", function () {
      if (idx < slides.length - 1) { idx++; seen[idx] = true; update(); }
    });
    Array.prototype.forEach.call(dotsWrap.children, function (d) {
      d.addEventListener("click", function () {
        idx = parseInt(d.getAttribute("data-i"), 10);
        seen[idx] = true;
        update();
      });
    });

    update();
  }

  /* ----------------------------- テスト画面 ----------------------------- */
  // 進行中の回答状態（再描画用にビュー内で保持）
  var quizState = null; // { id, answers:[], graded:bool, result }

  function renderQuiz(id) {
    var c = byId(id);
    if (!c) return renderNotFound();

    // 新しいコースのテストに入ったら回答状態を初期化
    if (!quizState || quizState.id !== id) {
      quizState = { id: id, answers: new Array(c.quiz.length).fill(null), graded: false, result: null };
    }

    if (quizState.graded && quizState.result) {
      renderQuizResult(c);
    } else {
      renderQuizForm(c);
    }
  }

  function renderQuizForm(c) {
    var questions = c.quiz.map(function (item, qi) {
      var choices = item.choices.map(function (ch, ci) {
        var checked = (quizState.answers[qi] === ci) ? " checked" : "";
        var selCls = (quizState.answers[qi] === ci) ? " selected" : "";
        return '' +
          '<label class="choice' + selCls + '" data-q="' + qi + '" data-c="' + ci + '">' +
            '<input type="radio" name="q' + qi + '" value="' + ci + '"' + checked + '>' +
            '<span class="choice-text">' + esc(ch) + '</span>' +
          '</label>';
      }).join("");

      return '' +
      '<div class="q-block" data-qblock="' + qi + '">' +
        '<div class="q-head">' +
          '<span class="q-num">' + (qi + 1) + '</span>' +
          '<span class="q-text">' + esc(item.q) + '</span>' +
        '</div>' +
        '<div class="choices">' + choices + '</div>' +
      '</div>';
    }).join("");

    app.innerHTML = '' +
    '<section class="view">' +
      '<div class="breadcrumb"><a href="#/dashboard">ダッシュボード</a> &rsaquo; ' +
        '<a href="#/course/' + c.id + '">' + esc(c.title) + '</a> &rsaquo; 確認テスト</div>' +
      '<h1 class="page-title">確認テスト：' + esc(c.title) + '</h1>' +
      '<p class="quiz-intro">全5問・4択。<span class="pass-rule">5問中4問以上（80%以上）正解で合格</span>です。' +
        'すべての問いに回答してから「採点する」を押してください。</p>' +
      questions +
      '<div class="grade-bar">' +
        '<span class="answer-progress" id="answerProgress"></span>' +
        '<a class="btn btn-ghost btn-sm" href="#/course/' + c.id + '">教材に戻る</a>' +
        '<button class="btn btn-green" id="gradeBtn">採点する</button>' +
      '</div>' +
    '</section>';

    // 選択ハンドラ
    var blocks = app.querySelectorAll(".q-block");
    Array.prototype.forEach.call(app.querySelectorAll(".choice"), function (label) {
      label.addEventListener("click", function () {
        var qi = parseInt(label.getAttribute("data-q"), 10);
        var ci = parseInt(label.getAttribute("data-c"), 10);
        quizState.answers[qi] = ci;
        // ラジオを確実にチェック
        var input = label.querySelector("input");
        if (input) input.checked = true;
        // 同じ設問内の selected クラスを更新
        var block = blocks[qi];
        Array.prototype.forEach.call(block.querySelectorAll(".choice"), function (l) {
          l.classList.toggle("selected", l === label);
        });
        updateAnswerProgress(c);
      });
    });

    updateAnswerProgress(c);

    document.getElementById("gradeBtn").addEventListener("click", function () {
      if (!window.Quiz.allAnswered(c.quiz, quizState.answers)) {
        var ap = document.getElementById("answerProgress");
        ap.textContent = "未回答の設問があります（" + window.Quiz.answeredCount(quizState.answers) + " / " + c.quiz.length + " 問回答済み）";
        ap.style.color = "var(--brick)";
        // 最初の未回答へスクロール
        for (var i = 0; i < quizState.answers.length; i++) {
          if (quizState.answers[i] == null) {
            var b = app.querySelector('[data-qblock="' + i + '"]');
            if (b) b.scrollIntoView({ behavior: "smooth", block: "center" });
            break;
          }
        }
        return;
      }
      quizState.result = window.Quiz.grade(c.quiz, quizState.answers);
      quizState.graded = true;
      // 合格していれば修了を記録（合格するまで修了にしない）
      if (quizState.result.passed) {
        markComplete(c.id, quizState.result.percent);
      }
      renderQuizResult(c);
      window.scrollTo(0, 0);
    });
  }

  function updateAnswerProgress(c) {
    var ap = document.getElementById("answerProgress");
    if (!ap) return;
    var n = window.Quiz.answeredCount(quizState.answers);
    ap.textContent = "回答済み " + n + " / " + c.quiz.length + " 問";
    ap.style.color = "var(--silver)";
    var btn = document.getElementById("gradeBtn");
    if (btn) btn.disabled = false; // 押せるが、未回答チェックは押下時に行う
  }

  function renderQuizResult(c) {
    var r = quizState.result;
    var passed = r.passed;

    // 各設問の正誤表示
    var review = r.results.map(function (res) {
      var item = c.quiz[res.index];
      var choices = item.choices.map(function (ch, ci) {
        var cls = "choice locked";
        var flag = "";
        if (ci === res.answerIndex) {
          cls += " correct";
          flag = '<span class="choice-flag ok">正解</span>';
        }
        if (ci === res.picked && ci !== res.answerIndex) {
          cls += " wrong";
          flag = '<span class="choice-flag ng">あなたの回答</span>';
        }
        return '' +
          '<div class="' + cls + '">' +
            '<span class="choice-text">' + esc(ch) + '</span>' + flag +
          '</div>';
      }).join("");

      var expCls = res.isCorrect ? "is-correct" : "is-wrong";
      var expLabel = res.isCorrect ? "正解" : "不正解";

      return '' +
      '<div class="q-block">' +
        '<div class="q-head">' +
          '<span class="q-num" style="' + (res.isCorrect ? "" : "background:var(--brick);") + '">' + (res.index + 1) + '</span>' +
          '<span class="q-text">' + esc(item.q) + '</span>' +
        '</div>' +
        '<div class="choices">' + choices + '</div>' +
        '<div class="explanation ' + expCls + '">' +
          '<span class="exp-label">【' + expLabel + '】解説</span>' +
          esc(res.explanation) +
        '</div>' +
      '</div>';
    }).join("");

    // 差し戻しブロック（不合格時の形成的評価）
    var reviewBlock = "";
    if (!passed) {
      var items = r.wrong.map(function (w) {
        return '' +
        '<div class="review-item">' +
          '<span class="ri-num">問' + (w.index + 1) + '</span>' +
          '<span class="ri-body">' +
            '<span class="ri-q">' + esc(c.quiz[w.index].q) + '</span>' +
            '<span class="ri-back">' + esc(w.backTo) + '</span>' +
          '</span>' +
        '</div>';
      }).join("");
      reviewBlock = '' +
      '<div class="review-block">' +
        '<h3>もう一度教材で確認しましょう</h3>' +
        '<p style="margin:0 0 10px;font-size:13.5px;color:var(--ink);">間違えた問題です。下の復習ポイントを見直してから、もう一度テストに挑戦してください。' +
          '（合格するまでこのコースは修了になりません）</p>' +
        items +
      '</div>';
    }

    var resultActions = passed ?
      '<div class="btn-row" style="justify-content:center;">' +
        '<a class="btn btn-ghost" href="#/dashboard">ダッシュボードに戻る</a>' +
        '<a class="btn btn-green btn-lg" href="#/cert/' + c.id + '">修了証を見る →</a>' +
      '</div>'
      :
      '<div class="btn-row" style="justify-content:center;">' +
        '<a class="btn btn-brick" href="#/course/' + c.id + '">教材に戻る</a>' +
        '<button class="btn btn-outline" id="retryBtn">もう一度テスト</button>' +
      '</div>';

    var heading = passed ? "修了しました！" : "もう一歩。再挑戦しましょう";
    var msg = passed
      ? "確認テストに合格し、このコースは「修了」になりました。修了証を発行できます。"
      : "合格まであと" + (r.threshold - r.correctCount) + "問です。間違えた箇所を教材で復習してから、もう一度挑戦してください。";

    app.innerHTML = '' +
    '<section class="view">' +
      '<div class="breadcrumb"><a href="#/dashboard">ダッシュボード</a> &rsaquo; ' +
        '<a href="#/course/' + c.id + '">' + esc(c.title) + '</a> &rsaquo; 採点結果</div>' +
      '<div class="result-card ' + (passed ? "pass" : "fail") + '">' +
        '<h2 class="result-heading">' + heading + '</h2>' +
        '<p class="result-score"><span class="score-big">' + r.correctCount + '</span> / ' + r.total +
          ' 問正解（' + r.percent + '%）</p>' +
        '<p class="result-msg">' + msg + '</p>' +
      '</div>' +
      reviewBlock +
      '<p class="section-label">設問ごとの正誤と解説</p>' +
      review +
      resultActions +
    '</section>';

    if (!passed) {
      var retry = document.getElementById("retryBtn");
      if (retry) retry.addEventListener("click", function () {
        // 回答をリセットして再受験
        quizState = { id: c.id, answers: new Array(c.quiz.length).fill(null), graded: false, result: null };
        renderQuizForm(c);
        window.scrollTo(0, 0);
      });
    }
  }

  /* ----------------------------- 修了証 ----------------------------- */
  function renderCert(id) {
    var c = byId(id);
    if (!c) return renderNotFound();
    var st = getCourseState(id);

    if (st.status !== "修了") {
      // 未修了で直接アクセスされた場合
      app.innerHTML = '' +
      '<section class="view">' +
        '<div class="breadcrumb"><a href="#/dashboard">ダッシュボード</a> &rsaquo; 修了証</div>' +
        '<div class="notice">このコースはまだ修了していません。確認テストに合格すると修了証を発行できます。</div>' +
        '<div class="btn-row">' +
          '<a class="btn" href="#/course/' + c.id + '">教材を受講する</a>' +
          '<a class="btn btn-outline" href="#/dashboard">ダッシュボードに戻る</a>' +
        '</div>' +
      '</section>';
      return;
    }

    var score = (st.score != null) ? st.score + "%" : "—";
    var date = st.date ? fmtDate(st.date) : fmtDate(todayStr());

    app.innerHTML = '' +
    '<section class="view">' +
      '<div class="breadcrumb"><a href="#/dashboard">ダッシュボード</a> &rsaquo; 修了証</div>' +
      '<div class="cert-stage">' +
        '<div class="certificate">' +
          '<span class="cert-corner tl"></span><span class="cert-corner tr"></span>' +
          '<span class="cert-corner bl"></span><span class="cert-corner br"></span>' +
          '<div class="cert-kicker">CERTIFICATE OF COMPLETION</div>' +
          '<div class="cert-title">修了証</div>' +
          '<div class="cert-rule"></div>' +
          '<p class="cert-lead">下記の者は</p>' +
          '<div class="cert-name">永井 蒼汰</div>' +
          '<div class="cert-name-reading">ながい そうた</div>' +
          '<p class="cert-body">' +
            'ホシガネ精工アカデミー所定の研修課程<br>' +
            '「<span class="cert-course">' + esc(c.title) + '</span>（' + esc(c.subtitle) + '）」<br>' +
            'を受講し、確認テストに合格したことを証します。' +
          '</p>' +
          '<div class="cert-meta">' +
            '<div>修了日<span class="cm-val">' + date + '</span></div>' +
            '<div>確認テスト<span class="cm-val">' + score + '</span></div>' +
          '</div>' +
          '<div class="cert-footer">' +
            '<div class="cert-org">' +
              '<div class="cert-org-name">株式会社ホシガネ精工</div>' +
              '<div class="cert-org-sub">ホシガネ精工アカデミー</div>' +
              '<div class="cert-credo">百分の一ミリに、誠実であれ。</div>' +
            '</div>' +
            '<div class="cert-seal" aria-hidden="true">' +
              '<span class="seal-mark">H</span>' +
              '<span class="seal-text">認 定</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row" style="justify-content:center;">' +
        '<a class="btn" href="#/dashboard">ダッシュボードに戻る</a>' +
      '</div>' +
    '</section>';
  }

  /* ----------------------------- Not Found ----------------------------- */
  function renderNotFound() {
    app.innerHTML = '' +
    '<section class="view">' +
      '<div class="notice">お探しのページが見つかりませんでした。</div>' +
      '<div class="btn-row"><a class="btn" href="#/dashboard">ダッシュボードに戻る</a></div>' +
    '</section>';
  }

  /* ----------------------------- ルーター ----------------------------- */
  function router() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash || hash === "/" ) { location.hash = "#/dashboard"; return; }

    var parts = hash.replace(/^\//, "").split("/"); // ["course","safety"] 等
    var route = parts[0];
    var arg = parts[1];

    // テスト以外のルートに移動したら採点状態を破棄（戻ってきたら最初から）
    if (route !== "quiz" && quizState) {
      // 受講に戻る・ダッシュボードへ等。次回テストは新規受験になる。
      quizState = null;
    }

    switch (route) {
      case "dashboard": renderDashboard(); break;
      case "course":    renderCourse(arg); break;
      case "quiz":      renderQuiz(arg); break;
      case "cert":      renderCert(arg); break;
      default:          renderNotFound();
    }
  }

  /* ----------------------------- リセット ----------------------------- */
  function bindReset() {
    var link = document.getElementById("reset-progress");
    if (!link) return;
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var ok = window.confirm("学習進捗をリセットして、デモの初期状態（修了3コース・60%）に戻します。よろしいですか？");
      if (!ok) return;
      resetProgress();
      quizState = null;
      if ((location.hash || "") === "#/dashboard") {
        renderDashboard();
      } else {
        location.hash = "#/dashboard";
      }
    });
  }

  /* ----------------------------- 起動 ----------------------------- */
  function boot() {
    if (!COURSES.length) {
      app.innerHTML = '<div class="notice">コースデータの読み込みに失敗しました（courses.js を確認してください）。</div>';
      return;
    }
    loadProgress();   // 初回ならプリセットをシード
    bindReset();
    window.addEventListener("hashchange", router);
    router();         // 初期描画
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
