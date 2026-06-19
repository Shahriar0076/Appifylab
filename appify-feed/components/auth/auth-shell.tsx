import Link from "next/link";
import { GoogleAuthButton } from "./google-auth-button";

export function AuthShell({ mode, children }: { mode: "login" | "registration"; children: React.ReactNode }) {
  const login = mode === "login";
  return (
    <section className={`${login ? "_social_login_wrapper" : "_social_registration_wrapper"} _layout_main_wrapper`}>
      <div className="_shape_one"><img src="/assets/images/shape1.svg" alt="" className="_shape_img" /><img src="/assets/images/dark_shape.svg" alt="" className="_dark_shape" /></div>
      <div className="_shape_two"><img src="/assets/images/shape2.svg" alt="" className="_shape_img" /><img src="/assets/images/dark_shape1.svg" alt="" className="_dark_shape _dark_shape_opacity" /></div>
      <div className="_shape_three"><img src="/assets/images/shape3.svg" alt="" className="_shape_img" /><img src="/assets/images/dark_shape2.svg" alt="" className="_dark_shape _dark_shape_opacity" /></div>
      <div className={login ? "_social_login_wrap" : "_social_registration_wrap"}>
        <div className="container"><div className="row align-items-center">
          <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
            <div className={login ? "_social_login_left" : "_social_registration_right"}>
              <div className={login ? "_social_login_left_image" : "_social_registration_right_image"}>
                <img src={`/assets/images/${login ? "login.png" : "registration.png"}`} alt="" className={login ? "_left_img" : ""} />
              </div>
            </div>
          </div>
          <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
            <div className={login ? "_social_login_content" : "_social_registration_content"}>
              <div className={`${login ? "_social_login_left_logo" : "_social_registration_right_logo"} _mar_b28`}>
                <img src="/assets/images/logo.svg" alt="Buddy Script" className={login ? "_left_logo" : "_right_logo"} />
              </div>
              <p className={`${login ? "_social_login_content_para" : "_social_registration_content_para"} _mar_b8`}>{login ? "Welcome back" : "Get Started Now"}</p>
              <h4 className={`${login ? "_social_login_content_title" : "_social_registration_content_title"} _titl4 _mar_b50`}>{login ? "Login to your account" : "Registration"}</h4>
              <GoogleAuthButton registration={!login} />
              <div className={`${login ? "_social_login_content_bottom_txt" : "_social_registration_content_bottom_txt"} _mar_b40`}><span>Or</span></div>
              {children}
              <div className={login ? "_social_login_bottom_txt" : "_social_registration_bottom_txt"}>
                <p className={login ? "_social_login_bottom_txt_para" : "_social_registration_bottom_txt_para"}>
                  {login ? "Don't have an account? " : "Already have an account? "}
                  <Link href={login ? "/registration" : "/login"}>{login ? "Create New Account" : "Login now"}</Link>
                </p>
              </div>
            </div>
          </div>
        </div></div>
      </div>
    </section>
  );
}
