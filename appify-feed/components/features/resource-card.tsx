import { useRouter } from "next/navigation";
import { mediaUrl } from "@/lib/api";

export function ResourceCard({
  title, subtitle, imageUrl, children, href,
}: {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  children?: React.ReactNode;
  href?: string;
}) {
  const router = useRouter();
  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
      <div className="appify-resource-row">
        {imageUrl !== undefined && <img src={mediaUrl(imageUrl)} alt="" />}
        <div className="appify-resource-copy"><h4 className="_title5">{href ? <button className="appify-link-button" onClick={() => router.push(href)}>{title}</button> : title}</h4>{subtitle && <p>{subtitle}</p>}</div>
        <div className="appify-resource-actions">{children}</div>
      </div>
    </div>
  );
}
