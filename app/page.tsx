'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TalkLoader from '@/components/TalkLoader';
import CommentPicker from '@/components/CommentPicker';
import HTMLGenerator from '@/components/HTMLGenerator';
import SettingsSidebar from '@/components/SettingsSidebar';
import SettingsModal from '@/components/SettingsModal';
import BulkProcessPanel from '@/components/BulkProcessPanel';
import { ThreadLoadingIndicator, AILoadingIndicator } from '@/components/LoadingSpinner';
import { fetchThreadData } from '@/lib/shikutoku-api';
import { Talk, Comment, CommentWithStyle, BlogSettings } from '@/lib/types';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { callClaudeAPI } from '@/lib/ai-summarize';
import { generateThumbnail, selectCharacterForArticle } from '@/lib/ai-thumbnail';
import { generateMatomeHTML } from '@/lib/html-templates';
import { markThreadAsSummarized } from '@/lib/bulk-processing';
import { ThumbnailCharacter } from '@/lib/types';
import toast from 'react-hot-toast';

// アンカー（>>数字）から参照先のレス番号を抽出
function extractAnchor(body: string): number | null {
  const match = body.match(/^>>(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// 選択済みコメントをアンカー順に並び替え（画面表示と一致させる）
function sortByAnchorOrder(selectedComments: CommentWithStyle[]): CommentWithStyle[] {
  if (selectedComments.length === 0) return [];

  // res_idからコメントへのマップ
  const resIdToComment = new Map<number, CommentWithStyle>();
  selectedComments.forEach(c => {
    resIdToComment.set(Number(c.res_id), c);
  });

  // アンカーを持つコメントをグループ化
  const repliesMap = new Map<number, CommentWithStyle[]>(); // 親res_id -> 返信コメント配列
  const commentsWithAnchor = new Set<string>();

  selectedComments.forEach(comment => {
    const anchorId = extractAnchor(comment.body);
    if (anchorId !== null && resIdToComment.has(anchorId)) {
      if (!repliesMap.has(anchorId)) {
        repliesMap.set(anchorId, []);
      }
      repliesMap.get(anchorId)!.push(comment);
      commentsWithAnchor.add(comment.id);
    }
  });

  // 結果配列を構築（親コメントの後に返信を挿入）
  const result: CommentWithStyle[] = [];

  // レス番号順にソートした選択コメント
  const sortedComments = [...selectedComments].sort((a, b) => Number(a.res_id) - Number(b.res_id));

  sortedComments.forEach(comment => {
    // アンカーを持つコメントは親の後に挿入されるのでスキップ
    if (commentsWithAnchor.has(comment.id)) {
      return;
    }

    result.push(comment);

    // このコメントへの返信を追加
    const replies = repliesMap.get(Number(comment.res_id));
    if (replies) {
      // 返信をres_id順でソート
      replies.sort((a, b) => Number(a.res_id) - Number(b.res_id));
      result.push(...replies);
    }
  });

  return result;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [currentTalk, setCurrentTalk] = useState<Talk | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const {
    value: selectedComments,
    setValue: setSelectedComments,
    canUndo,
    canRedo,
    undo,
    redo,
    reset: resetHistory
  } = useUndoRedo<CommentWithStyle[]>({
    initialState: [],
    maxHistorySize: 30
  });
  const [showHTMLModal, setShowHTMLModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<{ source: 'shikutoku' | '5ch' | 'open2ch' | '2chsc'; originalUrl: string } | null>(null);
  const [customName, setCustomName] = useState('');
  const [customNameBold, setCustomNameBold] = useState(true);
  const [customNameColor, setCustomNameColor] = useState('#ff69b4');
  const [commentColors, setCommentColors] = useState<Record<string, string>>({});
  const [commentSizes, setCommentSizes] = useState<Record<string, number>>({});
  const [editedComments, setEditedComments] = useState<Record<string, string>>({});
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [blogs, setBlogs] = useState<BlogSettings[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [showIdInHtml, setShowIdInHtml] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  // 一括処理後にモーダルを開くための期待するコメント数
  const [pendingModalCommentCount, setPendingModalCommentCount] = useState<number | null>(null);

  // 設定をローカルストレージから読み込み
  useEffect(() => {
    const savedNameSettings = localStorage.getItem('customNameSettings');
    if (savedNameSettings) {
      const settings = JSON.parse(savedNameSettings);
      setCustomName(settings.name || '');
      setCustomNameBold(settings.bold !== false);
      setCustomNameColor(settings.color || '#ff69b4');
    }
    // サムネイルはリロード時に初期化（localStorageから復元しない）
    // ID表示設定を読み込み
    const savedShowIdInHtml = localStorage.getItem('showIdInHtml');
    if (savedShowIdInHtml !== null) {
      setShowIdInHtml(savedShowIdInHtml === 'true');
    }
    // 開発者モードを読み込み
    const savedDevMode = localStorage.getItem('matomeln_dev_mode');
    if (savedDevMode === 'true') {
      setIsDevMode(true);
    }
    // ブログ設定を読み込み
    const savedBlogs = localStorage.getItem('blogSettingsList');
    if (savedBlogs) {
      const blogsList = JSON.parse(savedBlogs) as BlogSettings[];
      setBlogs(blogsList);
      // 選択中のブログIDを読み込み
      const savedSelectedId = localStorage.getItem('selectedBlogId');
      if (savedSelectedId && blogsList.some(b => b.id === savedSelectedId)) {
        setSelectedBlogId(savedSelectedId);
      } else if (blogsList.length > 0) {
        setSelectedBlogId(blogsList[0].id);
      }
    } else {
      // 旧形式のAPI設定があれば移行
      const savedApiSettings = localStorage.getItem('livedoorBlogApiSettings');
      if (savedApiSettings) {
        const oldSettings = JSON.parse(savedApiSettings);
        if (oldSettings.blogUrl && oldSettings.apiKey) {
          const migratedBlog: BlogSettings = {
            id: crypto.randomUUID(),
            name: oldSettings.blogUrl,
            blogId: oldSettings.blogUrl,
            apiKey: oldSettings.apiKey,
          };
          setBlogs([migratedBlog]);
          setSelectedBlogId(migratedBlog.id);
          localStorage.setItem('blogSettingsList', JSON.stringify([migratedBlog]));
          localStorage.setItem('selectedBlogId', migratedBlog.id);
        }
      }
    }
  }, []);

  // レス名設定をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('customNameSettings', JSON.stringify({
      name: customName,
      bold: customNameBold,
      color: customNameColor
    }));
  }, [customName, customNameBold, customNameColor]);

  // 選択中のブログ設定
  const selectedBlog = blogs.find(b => b.id === selectedBlogId);
  const apiSettings = selectedBlog
    ? { blogUrl: selectedBlog.blogId, apiKey: selectedBlog.apiKey }
    : { blogUrl: '', apiKey: '' };

  // ブログ設定の更新
  const handleBlogsChange = useCallback((newBlogs: BlogSettings[]) => {
    setBlogs(newBlogs);
    localStorage.setItem('blogSettingsList', JSON.stringify(newBlogs));
  }, []);

  // 選択中のブログIDの更新
  const handleSelectedBlogIdChange = useCallback((id: string | null) => {
    setSelectedBlogId(id);
    if (id) {
      localStorage.setItem('selectedBlogId', id);
    } else {
      localStorage.removeItem('selectedBlogId');
    }
  }, []);

  // ID表示設定の更新
  const handleShowIdInHtmlChange = useCallback((show: boolean) => {
    setShowIdInHtml(show);
    localStorage.setItem('showIdInHtml', String(show));
  }, []);

  // 一括処理後、selectedCommentsが期待する件数に達したらモーダルを開く
  useEffect(() => {
    if (pendingModalCommentCount !== null && selectedComments.length === pendingModalCommentCount) {
      console.log('🔓 モーダルを開く（selectedComments確定）:', selectedComments.map(c => `${c.res_id}`).join(', '));
      setPendingModalCommentCount(null);
      setShowHTMLModal(true);
    }
  }, [pendingModalCommentCount, selectedComments]);

  // スレ主のID
  const firstPosterId = comments[0]?.name_id;

  // スレ主のコメントを全選択
  const selectFirstPoster = useCallback(() => {
    if (!firstPosterId) return;
    const firstPosterComments = comments.filter(c => c.name_id === firstPosterId);
    const newSelected = firstPosterComments.map(c => {
      const existing = selectedComments.find(sc => sc.id === c.id);
      if (existing) return existing;
      const sizeValue = commentSizes[c.id];
      const fontSize: 'small' | 'medium' | 'large' = sizeValue === 14 ? 'small' : sizeValue === 22 ? 'large' : 'medium';
      return {
        ...c,
        body: editedComments[c.id] || c.body,
        color: commentColors[c.id] || '#ef4444',
        fontSize
      };
    });
    // 既存の選択に追加（重複を除く）
    const existingIds = new Set(selectedComments.map(sc => sc.id));
    const toAdd = newSelected.filter(c => !existingIds.has(c.id));
    setSelectedComments([...selectedComments, ...toAdd]);
  }, [comments, firstPosterId, selectedComments, setSelectedComments, commentColors, commentSizes, editedComments]);

  // スレ主のコメントの色を一括変更
  const changeFirstPosterColor = useCallback((color: string) => {
    if (!firstPosterId) return;
    const firstPosterIds = new Set(comments.filter(c => c.name_id === firstPosterId).map(c => c.id));

    // 色情報を更新
    const newColors = { ...commentColors };
    firstPosterIds.forEach(id => {
      newColors[id] = color;
    });
    setCommentColors(newColors);

    // 選択済みコメントの色を更新
    const updated = selectedComments.map(c =>
      firstPosterIds.has(c.id) ? { ...c, color } : c
    );
    setSelectedComments(updated);
  }, [comments, firstPosterId, selectedComments, setSelectedComments, commentColors]);

  // 全て選択
  const selectAll = useCallback(() => {
    const allComments = comments.map(c => {
      const sizeValue = commentSizes[c.id];
      const fontSize: 'small' | 'medium' | 'large' = sizeValue === 14 ? 'small' : sizeValue === 22 ? 'large' : 'medium';
      return {
        ...c,
        body: editedComments[c.id] || c.body,
        color: commentColors[c.id] || '#000000',
        fontSize
      };
    });
    setSelectedComments(allComments);
  }, [comments, commentColors, commentSizes, editedComments, setSelectedComments]);

  // 選択解除
  const deselectAll = useCallback(() => {
    setSelectedComments([]);
  }, [setSelectedComments]);

  // サムネイルURL変更（リロード時に初期化されるため保存しない）
  const handleThumbnailUrlChange = useCallback((url: string) => {
    setThumbnailUrl(url);
  }, []);

  // HTMLモーダルを開く際に自動生成
  const openHTMLModal = useCallback(() => {
    if (!currentTalk || selectedComments.length === 0) {
      toast.error('コメントを選択してください');
      return;
    }
    setShowHTMLModal(true);
  }, [currentTalk, selectedComments.length]);

  // Ctrl+Enter / Cmd+Enter でタグ発行モーダルを開く
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // モーダルが開いている場合や、入力フォーカス中は無視
      if (showHTMLModal) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        openHTMLModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHTMLModal, openHTMLModal]);

  // Headerからの設定モーダルを開くイベントをリッスン
  useEffect(() => {
    const handleOpenSettingsModal = () => {
      setShowSettingsModal(true);
    };

    window.addEventListener('openSettingsModal', handleOpenSettingsModal);
    return () => window.removeEventListener('openSettingsModal', handleOpenSettingsModal);
  }, []);

  // AIまとめ機能
  const handleAISummarize = async () => {
    if (!currentTalk) {
      toast.error('スレッドを読み込んでください');
      return;
    }

    if (comments.length === 0) {
      toast.error('コメントがありません');
      return;
    }

    // Claude APIキーを取得
    const apiKey = localStorage.getItem('matomeln_claude_api_key');
    if (!apiKey) {
      toast.error('Claude APIキーが設定されていません。設定ページで入力してください。');
      return;
    }

    setGeneratingAI(true);
    const toastId = toast.loading('AIがレスを分析中...');

    try {
      const aiResponse = await callClaudeAPI(apiKey, currentTalk.title, comments);

      // AIの選択結果をCommentWithStyle[]に変換
      // 後方互換性のためのカラーマップ（古い形式 red/blue/green にも対応）
      const colorMap: Record<string, string> = {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#22c55e'
      };

      const newSelectedComments: CommentWithStyle[] = [];
      const newCommentColors: Record<string, string> = { ...commentColors };
      const newCommentSizes: Record<string, number> = { ...commentSizes };

      // 選択されたレスを処理
      for (const post of aiResponse.selected_posts) {
        const comment = comments[post.post_number - 1];
        if (!comment) continue;

        // 色を設定（カラーコード or 旧形式の色名）
        let color = '#000000';
        if (post.decorations.color) {
          if (post.decorations.color.startsWith('#')) {
            // カラーコード形式
            color = post.decorations.color;
          } else if (colorMap[post.decorations.color]) {
            // 旧形式の色名
            color = colorMap[post.decorations.color];
          }
        }
        newCommentColors[comment.id] = color;

        // サイズを設定（large = 22px, small = 14px, 通常 = 18px）
        let size = 18;
        if (post.decorations.size_boost === 'large') {
          size = 22;
        } else if (post.decorations.size_boost === 'small') {
          size = 14;
        }
        newCommentSizes[comment.id] = size;

        // CommentWithStyleを作成
        const fontSize: 'small' | 'medium' | 'large' =
          size === 22 ? 'large' : size === 14 ? 'small' : 'medium';
        newSelectedComments.push({
          ...comment,
          body: editedComments[comment.id] || comment.body,
          color,
          fontSize
        });
      }

      // AIが返した順番をそのまま使用（ソートしない）
      // ユーザーは後からCommentPickerで並び替え可能

      // 状態を更新
      setCommentColors(newCommentColors);
      setCommentSizes(newCommentSizes);
      setSelectedComments(newSelectedComments);

      toast.success(`${newSelectedComments.length}件のレスを選択しました`, { id: toastId });
    } catch (error) {
      console.error('AI summarize error:', error);
      if (error instanceof Error) {
        toast.error(error.message, { id: toastId });
      } else {
        toast.error('AIまとめに失敗しました', { id: toastId });
      }
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleLoadThread = async (input: string) => {
    setLoading(true);
    setComments([]); // 既存のコメントをクリア
    resetHistory(); // 履歴もリセット

    try {
      const { talk, comments: loadedComments, source } = await fetchThreadData(input);

      setCurrentTalk(talk);
      setComments(loadedComments);
      setSourceInfo({ source, originalUrl: input });

      const sourceLabel = source === '5ch' ? '5ch' : source === 'open2ch' ? 'open2ch' : source === '2chsc' ? '2ch.sc' : 'Shikutoku';
      toast.success(`「${talk.title}」を読み込みました（${sourceLabel}）`);
    } catch (error) {
      // 開発環境のみエラーログを出力
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading thread:', error);
      }

      // エラーメッセージをより具体的に表示
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('読み込みエラーが発生しました');
      }
      throw error; // 一括処理用に再スロー
    } finally {
      setLoading(false);
    }
  };

  // 一括処理用のURL読み込み→AIまとめ→AIサムネ→ブログ投稿（Promiseを返す）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleBulkProcess = useCallback(async (url: string) => {
    try {
      // 設定を取得
      const claudeApiKey = localStorage.getItem('matomeln_claude_api_key');
      const geminiApiKey = localStorage.getItem('matomeln_gemini_api_key');
      const savedBlogs = localStorage.getItem('blogSettingsList');
      const savedSelectedBlogId = localStorage.getItem('selectedBlogId');

      if (!claudeApiKey) {
        throw new Error('Claude APIキーが設定されていません');
      }

      // ブログ設定を取得
      let blogSettings: BlogSettings | null = null;
      if (savedBlogs) {
        const blogsList: BlogSettings[] = JSON.parse(savedBlogs);
        if (savedSelectedBlogId) {
          blogSettings = blogsList.find(b => b.id === savedSelectedBlogId) || null;
        }
        if (!blogSettings && blogsList.length > 0) {
          blogSettings = blogsList[0];
        }
      }

      if (!blogSettings) {
        throw new Error('ブログ設定がありません');
      }

      // サムネイルキャラクター設定を取得（AIが記事に合うキャラを選択）
      let thumbnailCharacter: ThumbnailCharacter | undefined;
      const savedCharacters = localStorage.getItem('matomeln_thumbnail_characters');
      let allCharacters: ThumbnailCharacter[] = [];
      if (savedCharacters) {
        allCharacters = JSON.parse(savedCharacters);
      }

      // レス名設定を取得
      let customNameSettings = { name: '', bold: true, color: '#ff69b4' };
      const savedNameSettings = localStorage.getItem('customNameSettings');
      if (savedNameSettings) {
        customNameSettings = JSON.parse(savedNameSettings);
      }

      // =====================
      // 1. スレッド読み込み
      // =====================
      setLoading(true);
      setComments([]);
      resetHistory();

      const { talk, comments: loadedComments, source } = await fetchThreadData(url);

      setCurrentTalk(talk);
      setComments(loadedComments);
      setSourceInfo({ source, originalUrl: url });
      setLoading(false);

      const sourceLabel = source === '5ch' ? '5ch' : source === 'open2ch' ? 'open2ch' : source === '2chsc' ? '2ch.sc' : 'Shikutoku';
      toast.success(`「${talk.title}」を読み込みました（${sourceLabel}）`);

      // =====================
      // 2. AIまとめを実行
      // =====================
      setGeneratingAI(true);
      toast.loading('AIがレスを分析中...', { id: 'bulk-step' });

      const aiResponse = await callClaudeAPI(claudeApiKey, talk.title, loadedComments);

      const colorMap: Record<string, string> = {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#22c55e'
      };

      const newSelectedComments: CommentWithStyle[] = [];
      const newCommentColors: Record<string, string> = {};
      const newCommentSizes: Record<string, number> = {};

      for (const post of aiResponse.selected_posts) {
        const comment = loadedComments[post.post_number - 1];
        if (!comment) continue;

        let color = '#000000';
        if (post.decorations.color) {
          if (post.decorations.color.startsWith('#')) {
            color = post.decorations.color;
          } else if (colorMap[post.decorations.color]) {
            color = colorMap[post.decorations.color];
          }
        }
        newCommentColors[comment.id] = color;

        let size = 18;
        if (post.decorations.size_boost === 'large') {
          size = 22;
        } else if (post.decorations.size_boost === 'small') {
          size = 14;
        }
        newCommentSizes[comment.id] = size;

        const fontSize: 'small' | 'medium' | 'large' =
          size === 22 ? 'large' : size === 14 ? 'small' : 'medium';
        newSelectedComments.push({
          ...comment,
          body: comment.body,
          color,
          fontSize
        });
      }

      // AIが返した順番をそのまま使用（ソートしない）
      // デバッグ: AI選択結果を確認
      console.log('🤖 AI選択結果:', newSelectedComments.map(c => `${c.res_id}`).join(', '));

      setCommentColors(newCommentColors);
      setCommentSizes(newCommentSizes);
      setSelectedComments(newSelectedComments);
      setGeneratingAI(false);

      toast.success(`${newSelectedComments.length}件のレスを選択`, { id: 'bulk-step' });

      // =====================
      // 3. AIサムネ生成 & アップロード
      // =====================
      let generatedThumbnailUrl = '';
      if (geminiApiKey && blogSettings) {
        // キャラクターが複数ある場合、AIが記事に合うキャラを選択
        if (allCharacters.length > 0) {
          toast.loading('キャラクターを選択中...', { id: 'bulk-step' });
          thumbnailCharacter = await selectCharacterForArticle(geminiApiKey, talk.title, allCharacters);
          if (thumbnailCharacter) {
            console.log('📷 選択されたキャラクター:', thumbnailCharacter.name, '参考画像:', thumbnailCharacter.referenceImageUrls?.length || 0, '枚');
          }
        }

        toast.loading('AIサムネイルを生成中...', { id: 'bulk-step' });
        try {
          const thumbnailResult = await generateThumbnail(
            geminiApiKey,
            talk.title,
            thumbnailCharacter
          );

          if (thumbnailResult.success && thumbnailResult.imageBase64) {
            // Base64画像をBlobに変換してアップロード
            toast.loading('サムネイルをアップロード中...', { id: 'bulk-step' });
            const binary = atob(thumbnailResult.imageBase64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              array[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([array], { type: 'image/png' });

            const formData = new FormData();
            formData.append('blogId', blogSettings.blogId);
            formData.append('apiKey', blogSettings.apiKey);
            formData.append('file', blob, `ai-thumbnail-${Date.now()}.png`);

            const uploadResponse = await fetch('/api/proxy/uploadImage', {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              if (uploadData.url) {
                generatedThumbnailUrl = uploadData.url;
                setThumbnailUrl(generatedThumbnailUrl);
                toast.success('サムネイルアップロード完了', { id: 'bulk-step' });
              }
            } else {
              console.warn('サムネイルアップロード失敗');
            }
          } else {
            console.warn('サムネイル生成失敗:', thumbnailResult.error);
            toast.error(`サムネイル生成失敗: ${thumbnailResult.error}`, { id: 'bulk-step' });
          }
        } catch (thumbnailError) {
          console.warn('サムネイル生成エラー:', thumbnailError);
          // サムネイル生成失敗でも続行
        }
      }

      // =====================
      // 4. ブログ投稿（HTMLGenerator経由ではなく直接投稿）
      // =====================
      toast.loading('ブログに投稿中...', { id: 'bulk-step' });

      // アンカー順に並び替え
      const sortedComments = sortByAnchorOrder(newSelectedComments);

      // HTML生成
      const generatedHTML = await generateMatomeHTML(
        talk,
        sortedComments,
        {
          includeImages: true,
          style: 'simple',
          includeTimestamp: true,
          includeName: false,
          commentStyle: {
            bold: true,
            fontSize: 'large',
            color: '#000000',
          },
        },
        { source, originalUrl: url },
        customNameSettings.name,
        customNameSettings.bold,
        customNameSettings.color,
        generatedThumbnailUrl,
        true, // showIdInHtml
        true  // isDevMode
      );

      // 本文と続きを読むを組み合わせてブログ記事の内容を作成
      const fullBody = generatedHTML.footer
        ? `${generatedHTML.body}\n<!--more-->\n${generatedHTML.footer}`
        : generatedHTML.body;

      // ブログ投稿
      const postResponse = await fetch('/api/proxy/postBlog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blogId: blogSettings.blogId,
          apiKey: blogSettings.apiKey,
          title: generatedHTML.title,
          body: fullBody,
          draft: false,
        }),
      });

      if (!postResponse.ok) {
        const errorData = await postResponse.json();
        throw new Error(errorData.error || 'ブログ投稿に失敗しました');
      }

      // =====================
      // 4.5. 他のブログにも同時投稿（設定がある場合）
      // =====================
      try {
        const otherBlogsSettingsStr = localStorage.getItem('matomeln_other_blogs_settings');
        if (otherBlogsSettingsStr) {
          const otherBlogsSettings = JSON.parse(otherBlogsSettingsStr);
          if (otherBlogsSettings.postToOtherBlogs && otherBlogsSettings.selectedOtherBlogIds?.length > 0) {
            const blogsStr = localStorage.getItem('matomeln_blogs');
            if (blogsStr) {
              const allBlogs = JSON.parse(blogsStr);
              const otherBlogs = allBlogs.filter((b: { id: string }) =>
                otherBlogsSettings.selectedOtherBlogIds.includes(b.id)
              );

              for (const blog of otherBlogs) {
                try {
                  const otherResponse = await fetch('/api/proxy/postBlog', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      blogId: blog.blogId,
                      apiKey: blog.apiKey,
                      title: generatedHTML.title,
                      body: fullBody,
                      draft: false,
                    }),
                  });

                  if (otherResponse.ok) {
                    console.log(`✅ ${blog.name}にも投稿完了`);
                  } else {
                    console.warn(`⚠️ ${blog.name}への投稿失敗`);
                  }
                } catch (otherError) {
                  console.warn(`⚠️ ${blog.name}への投稿エラー:`, otherError);
                }
              }
            }
          }
        }
      } catch (otherBlogsError) {
        console.warn('他のブログへの投稿処理エラー:', otherBlogsError);
        // エラーでも続行
      }

      // =====================
      // 5. スレメモくんに投稿済みとして登録
      // =====================
      try {
        await markThreadAsSummarized(url);
        console.log('✅ スレメモくんに登録完了:', url);
      } catch (memoError) {
        console.warn('⚠️ スレメモくん登録失敗:', memoError);
        // 登録失敗でもエラーにはしない
      }

      toast.success('ブログ投稿完了！', { id: 'bulk-step' });

    } catch (error) {
      console.error('一括処理エラー:', error);
      // エラーを再スローして呼び出し元でキャッチできるようにする
      throw error;
    } finally {
      // 処理完了後の状態をクリーンアップ
      setGeneratingAI(false);
      setLoading(false);
    }
  }, [resetHistory, setSelectedComments]);

  return (
    <div className="flex gap-6">
      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="relative">
          <TalkLoader
            onLoad={handleLoadThread}
            currentTalk={currentTalk}
            commentsCount={comments.length}
            thumbnailUrl={thumbnailUrl}
            onThumbnailUrlChange={handleThumbnailUrlChange}
            apiSettings={apiSettings}
            isDevMode={isDevMode}
            clearInputOnLoad={false}
          />
          {loading && (
            <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center z-10">
              <ThreadLoadingIndicator />
            </div>
          )}
        </div>

        {/* 開発者モードのAI機能 */}
        {isDevMode && (
          <>
            {/* 一括AIまとめパネル */}
            <BulkProcessPanel
              onBulkProcess={handleBulkProcess}
              isProcessingAI={generatingAI}
            />

            {/* AIまとめボタン（スレッド読み込み後のみ表示） */}
            {currentTalk && comments.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleAISummarize}
                  disabled={generatingAI}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
                >
                  {generatingAI ? (
                    <AILoadingIndicator text="AIが分析中" className="text-white" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AIでまとめる
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {comments.length > 0 && (
          <>
            <CommentPicker
              comments={comments}
              selectedComments={selectedComments}
              onSelectionChange={setSelectedComments}
              showId={currentTalk?.show_id}
              customName={customName}
              customNameBold={customNameBold}
              customNameColor={customNameColor}
              showOnlySelected={showOnlySelected}
              commentSizes={commentSizes}
              onCommentSizesChange={setCommentSizes}
            />

            {/* HTML生成ボタン */}
            {selectedComments.length > 0 && (
              <div className="fixed bottom-6 right-6 z-40">
                <button
                  onClick={openHTMLModal}
                  className="bg-gradient-to-r from-orange-400 to-pink-400 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:from-orange-500 hover:to-pink-500 hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  タグを発行 ({selectedComments.length}件)
                  <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">{typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+Enter</kbd>
                </button>
              </div>
            )}

            {/* 上下スクロールボタン */}
            <div className="fixed top-1/2 left-4 -translate-y-1/2 z-40 flex flex-col gap-2">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-50 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
                title="ページの先頭へ"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-50 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
                title="ページの末尾へ"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* HTMLモーダル */}
        {showHTMLModal && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="html-modal-title"
          >
            <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-orange-100 flex justify-between items-center bg-white/80 backdrop-blur-sm">
                <h2 id="html-modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </span>
                  タグ発行
                </h2>
                <button
                  onClick={() => setShowHTMLModal(false)}
                  className="p-2 hover:bg-orange-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
                  aria-label="閉じる"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
                <HTMLGenerator
                  talk={currentTalk}
                  selectedComments={sortByAnchorOrder(selectedComments)}
                  sourceInfo={sourceInfo}
                  onClose={() => setShowHTMLModal(false)}
                  customName={customName}
                  customNameBold={customNameBold}
                  customNameColor={customNameColor}
                  thumbnailUrl={thumbnailUrl}
                  apiSettings={apiSettings}
                  selectedBlogName={selectedBlog?.name}
                  showIdInHtml={showIdInHtml}
                  isDevMode={isDevMode}
                  blogs={blogs}
                  selectedBlogId={selectedBlogId || ''}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* サイドバー */}
      <SettingsSidebar
        comments={comments}
        onSelectFirstPoster={selectFirstPoster}
        onChangeFirstPosterColor={changeFirstPosterColor}
        selectedCount={selectedComments.length}
        totalCount={comments.length}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        showOnlySelected={showOnlySelected}
        onShowOnlySelectedChange={setShowOnlySelected}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
      />

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isDevMode={isDevMode}
        onDevModeChange={setIsDevMode}
        customName={customName}
        onCustomNameChange={setCustomName}
        customNameBold={customNameBold}
        onCustomNameBoldChange={setCustomNameBold}
        customNameColor={customNameColor}
        onCustomNameColorChange={setCustomNameColor}
        showIdInHtml={showIdInHtml}
        onShowIdInHtmlChange={handleShowIdInHtmlChange}
        blogs={blogs}
        selectedBlogId={selectedBlogId}
        onBlogsChange={handleBlogsChange}
        onSelectedBlogIdChange={handleSelectedBlogIdChange}
      />
    </div>
  );
}