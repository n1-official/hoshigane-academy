/* =====================================================================
   ホシガネ精工アカデミー — テスト採点・形成的評価ロジック
   合格基準: 5問中4問以上正解(=80%以上)で合格。3問以下は不合格。
   不合格時は間違えた問題ごとに backTo(復習箇所)を返す＝差し戻し。
   window.Quiz として app.js から利用する。
   ===================================================================== */
(function () {
  "use strict";

  var PASS_THRESHOLD = 4; // 5問中4問以上で合格

  /**
   * 採点する。
   * @param {Array} quiz   コースの quiz 配列（各 {q, choices, answerIndex, explanation, backTo}）
   * @param {Array} answers ユーザーの回答（各問の選択 index。未回答は null）
   * @returns {Object} 採点結果
   */
  function grade(quiz, answers) {
    var total = quiz.length;
    var results = quiz.map(function (item, i) {
      var picked = (answers && answers[i] != null) ? answers[i] : null;
      var isCorrect = picked === item.answerIndex;
      return {
        index: i,
        question: item.q,
        choices: item.choices,
        picked: picked,
        answerIndex: item.answerIndex,
        isCorrect: isCorrect,
        explanation: item.explanation,
        backTo: item.backTo
      };
    });

    var correctCount = results.filter(function (r) { return r.isCorrect; }).length;
    var percent = total ? Math.round((correctCount / total) * 100) : 0;
    var passed = correctCount >= PASS_THRESHOLD;

    // 間違えた問題（差し戻しに使う）
    var wrong = results.filter(function (r) { return !r.isCorrect; });

    return {
      total: total,
      correctCount: correctCount,
      percent: percent,
      passed: passed,
      threshold: PASS_THRESHOLD,
      results: results,
      wrong: wrong
    };
  }

  /** 全問回答済みか（採点ボタンの活性判定に使う） */
  function allAnswered(quiz, answers) {
    if (!answers) return false;
    for (var i = 0; i < quiz.length; i++) {
      if (answers[i] == null) return false;
    }
    return true;
  }

  /** 回答済み数 */
  function answeredCount(answers) {
    if (!answers) return 0;
    return answers.filter(function (a) { return a != null; }).length;
  }

  window.Quiz = {
    PASS_THRESHOLD: PASS_THRESHOLD,
    grade: grade,
    allAnswered: allAnswered,
    answeredCount: answeredCount
  };
})();
