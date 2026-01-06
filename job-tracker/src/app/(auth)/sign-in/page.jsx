"use client";

import { useState } from "react";
import { Noto_Sans_SC, Space_Grotesk } from "next/font/google";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const backgroundStyle = {
  background:
    "radial-gradient(1200px 600px at 10% -10%, #ffffff 0%, transparent 60%), linear-gradient(135deg, #F6F1EA, #E9F4F3)",
};

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState("");

  const sendMagicLink = async ({ nextStatus }) => {
    const supabase = createClient();

    const redirectTo = `${window.location.origin}/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      return { ok: false };
    }

    setStatus(nextStatus);
    return { ok: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    setResendError("");

    const result = await sendMagicLink({ nextStatus: "success" });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage("发送失败，请检查邮箱后再试一次。");
    }
  };

  const handleResend = () => {
    setStatus("idle");
    setErrorMessage("");
    setResendError("");
  };

  const handleResendNow = async () => {
    setIsResending(true);
    setResendError("");

    const result = await sendMagicLink({ nextStatus: "success" });

    if (!result.ok) {
      setResendError("重新发送失败，请稍后再试。");
    }

    setIsResending(false);
  };

  const urlParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const urlError = urlParams?.get("error");

  return (
    <div
      className={`relative min-h-screen overflow-hidden px-6 py-16 ${bodyFont.className}`}
      style={backgroundStyle}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 right-[8%] h-80 w-80 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="absolute -bottom-24 left-[6%] h-96 w-96 rounded-full bg-teal-700/20 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-600/10 px-3 py-1 text-xs font-semibold text-teal-800">
            轻松模式 · 今天也很顺利
          </span>
          <div className="space-y-4">
            <h1
              className={`${displayFont.className} text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl`}
            >
              让求职回到轻松节奏
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600">
              记录、跟进、复盘一气呵成。你只需要专注投递，我们帮你梳理每一次机会。
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-amber-400" />
              一眼看清所有投递进度
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-amber-400" />
              提醒关键节点，不再错过
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-amber-400" />
              复盘记录沉淀成长
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/80 p-8 shadow-[0_25px_60px_-30px_rgba(15,118,110,0.45)] backdrop-blur">
          <div className="space-y-2 text-center">
            <h2
              className={`${displayFont.className} text-2xl font-semibold text-slate-900`}
            >
              欢迎回来
            </h2>
            <p className="text-sm text-slate-500">继续你的求职旅程，轻松一点。</p>
          </div>

          {urlError && status === "idle" && (
            <div className="mt-6 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 text-sm text-red-700">
              {urlError === "invalid_link"
                ? "登录链接已过期或无效，请重新获取。"
                : "登录过程中出现问题，请稍后重试。"}
            </div>
          )}

          {status === "success" ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <p className="font-medium">登录链接已发送</p>
                <p className="mt-1 text-emerald-600">
                  我们已发送到 <strong>{email}</strong>
                </p>
              </div>
              {resendError && (
                <div className="rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {resendError}
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleResendNow}
                className="h-11 w-full rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50"
                disabled={isResending}
              >
                {isResending ? "正在发送..." : "重新发送链接"}
              </Button>
              <Button
                onClick={handleResend}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500 text-white shadow-sm hover:from-teal-600 hover:via-teal-500 hover:to-emerald-400"
              >
                使用其他邮箱
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {status === "error" && (
                <div className="rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-600"
                >
                  邮箱地址
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-200"
                  placeholder="name@example.com"
                  disabled={status === "loading"}
                />
              </div>

              <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-xs text-teal-700">
                登录链接会发送到你的邮箱，请在 15 分钟内完成验证。
              </div>

              <Button
                type="submit"
                disabled={status === "loading"}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500 text-white shadow-sm hover:from-teal-600 hover:via-teal-500 hover:to-emerald-400"
              >
                {status === "loading" ? "正在发送..." : "发送登录链接"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            还没有账号？
            <a className="ml-1 font-semibold text-teal-700" href="#">
              免费注册
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
