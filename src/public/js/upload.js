;(() => {
    const config = window.ALBUM_CONFIG || { maxFiles: 15 }

    const form = document.getElementById('upload-form')
    const btnCamera = document.getElementById('btn-camera')
    const btnLibrary = document.getElementById('btn-library')
    const inputCameraPhoto = document.getElementById('input-camera-photo')
    const inputCameraVideo = document.getElementById('input-camera-video')
    const inputLibrary = document.getElementById('input-library')
    const cameraChoiceDialog = document.getElementById('camera-choice-dialog')
    const choicePhotoBtn = document.getElementById('choice-photo')
    const choiceVideoBtn = document.getElementById('choice-video')
    const previewGrid = document.getElementById('preview-grid')
    const submitBtn = document.getElementById('submit-btn')
    const feedback = document.getElementById('feedback')
    const guestNameInput = document.getElementById('guestName')
    const messageInput = document.getElementById('message')

    let selectedFiles = []

    function showFeedback(message, type) {
        feedback.textContent = message
        feedback.className = `feedback show ${type}`
    }

    function hideFeedback() {
        feedback.className = 'feedback'
    }

    function renderPreviews() {
        previewGrid.innerHTML = ''
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div')
            item.className = 'preview-item'

            const isVideo = file.type.startsWith('video/')
            const media = document.createElement(isVideo ? 'video' : 'img')
            media.src = URL.createObjectURL(file)
            if (isVideo) {
                media.muted = true
                media.playsInline = true
            }
            item.appendChild(media)

            const removeBtn = document.createElement('button')
            removeBtn.type = 'button'
            removeBtn.className = 'remove-btn'
            removeBtn.textContent = '✕'
            removeBtn.addEventListener('click', () => {
                selectedFiles.splice(index, 1)
                renderPreviews()
            })
            item.appendChild(removeBtn)

            previewGrid.appendChild(item)
        })

        submitBtn.disabled = selectedFiles.length === 0
    }

    function addFiles(fileList) {
        const incoming = Array.from(fileList || [])
        const room = config.maxFiles - selectedFiles.length

        if (incoming.length > room) {
            showFeedback(`Você pode enviar no máximo ${config.maxFiles} fotos/vídeos por vez.`, 'error')
        } else {
            hideFeedback()
        }

        selectedFiles = selectedFiles.concat(incoming.slice(0, Math.max(room, 0)))
        renderPreviews()
    }

    btnCamera.addEventListener('click', () => cameraChoiceDialog.showModal())
    btnLibrary.addEventListener('click', () => inputLibrary.click())

    choicePhotoBtn.addEventListener('click', () => {
        cameraChoiceDialog.close()
        inputCameraPhoto.click()
    })

    choiceVideoBtn.addEventListener('click', () => {
        cameraChoiceDialog.close()
        inputCameraVideo.click()
    })

    cameraChoiceDialog.addEventListener('click', (e) => {
        if (e.target === cameraChoiceDialog) cameraChoiceDialog.close()
    })

    inputCameraPhoto.addEventListener('change', (e) => {
        addFiles(e.target.files)
        e.target.value = ''
    })

    inputCameraVideo.addEventListener('change', (e) => {
        addFiles(e.target.files)
        e.target.value = ''
    })

    inputLibrary.addEventListener('change', (e) => {
        addFiles(e.target.files)
        e.target.value = ''
    })

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        if (selectedFiles.length === 0) return

        submitBtn.disabled = true
        submitBtn.textContent = 'Enviando...'
        hideFeedback()

        const formData = new FormData()
        selectedFiles.forEach((file) => formData.append('photos', file))
        if (guestNameInput.value.trim()) formData.append('guestName', guestNameInput.value.trim())
        if (messageInput.value.trim()) formData.append('message', messageInput.value.trim())

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                showFeedback(data.error || 'Não foi possível enviar seus arquivos. Tente novamente.', 'error')
            } else {
                const rejectedCount = (data.rejected || []).length
                const okMessage =
                    rejectedCount > 0
                        ? `${data.accepted} arquivo(s) enviado(s) com sucesso — ${rejectedCount} não puderam ser processados.`
                        : `${data.accepted} arquivo(s) enviado(s) com sucesso! Obrigado :)`
                showFeedback(okMessage, 'success')
                selectedFiles = []
                renderPreviews()
                form.reset()
            }
        } catch {
            showFeedback('Falha de conexão. Verifique sua internet e tente novamente.', 'error')
        } finally {
            submitBtn.textContent = 'Enviar'
            submitBtn.disabled = selectedFiles.length === 0
        }
    })
})()
