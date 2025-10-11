import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { fetchArticleDataServer, type ArticleData } from "@/lib/sheets";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import type { Metadata } from 'next';
import { marked } from "marked";

type Props = {
  params: { id: string };
};

async function getArticle(id: string): Promise<ArticleData | undefined> {
    const articles = await fetchArticleDataServer();
    return articles.find((article) => article.id === id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle(params.id);

  if (!article) {
    return {
      title: "記事が見つかりません"
    };
  }

  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle(params.id);

  if (!article) {
    notFound();
  }
  
  const contentHtml = await marked.parse(article.content || "");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12 md:py-16">
        <article className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <header className="mb-8 md:mb-12 text-center">
            <Badge variant="secondary" className="mb-4">{article.category}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4">{article.title}</h1>
            <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-4">
              <div className="flex items-center gap-2"><User className="h-4 w-4" />{article.author}</div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(article.publishedAt).toLocaleDateString('ja-JP')}</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{article.readTime}分</div>
            </div>
          </header>
          {article.image && <img src={article.image} alt={article.title} className="w-full rounded-lg mb-8 md:mb-12 aspect-video object-cover" />}
          <div className="prose prose-lg dark:prose-invert max-w-none mx-auto" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </article>
      </main>
      <Footer />
    </div>
  );
}
