"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, User } from "lucide-react"
import { getComments, addComment, type Comment } from "@/app/actions/comments"
import { showToast } from "@/components/toaster"

export function CommentSection({ companyId }: { companyId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // 初回読み込み時にコメントを取得
  useEffect(() => {
    const fetchComments = async () => {
      const data = await getComments(companyId)
      setComments(data)
      setIsLoading(false)
    }
    fetchComments()
  }, [companyId])

  // コメント送信処理
  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    const result = await addComment(formData)
    setIsSubmitting(false)

    if (result.error) {
      showToast(result.error, "info")
    } else {
      showToast("コメントを投稿しました", "success")
      formRef.current?.reset() // フォームをリセット
      // 最新のコメントを再取得して表示を更新
      const updatedData = await getComments(companyId)
      setComments(updatedData)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? "" : date.toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-xl font-bold text-primary">
        <MessageSquare className="w-5 h-5" />
        みんなのコメント ({comments.length})
      </h3>

      {/* コメント投稿フォーム */}
      <form ref={formRef} action={handleSubmit} className="bg-card p-4 rounded-lg border space-y-4">
        <input type="hidden" name="companyId" value={companyId} />
        <Input 
          name="userName" 
          placeholder="お名前（省略すると「匿名」になります）" 
          maxLength={30}
          className="bg-background"
        />
        <Textarea 
          name="content" 
          placeholder="この企業についての質問や感想を書いてみましょう！" 
          required 
          maxLength={500}
          className="bg-background min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? "送信中..." : <><Send className="w-4 h-4" /> 投稿する</>}
          </Button>
        </div>
      </form>

      {/* コメント一覧 */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground text-sm text-center py-4">読み込み中...</p>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8 bg-muted/30 rounded-lg">まだコメントはありません。最初のコメントを投稿してみましょう！</p>
        ) : (
          comments.map((comment, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-lg border bg-card/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-grow space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{comment.userName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}