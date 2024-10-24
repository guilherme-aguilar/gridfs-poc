'use client'

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Trash2, Pencil, Plus } from "lucide-react"
import { toast } from '@/hooks/use-toast'

interface File {
  _id: string
  length: number
  chunkSize: number
  uploadDate: string
  filename: string
}

const BASE_URL = 'http://localhost:3000'

export default function FileManager() {
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingFile, setEditingFile] = useState<string | null>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${BASE_URL}/files`)
      if (!response.ok) throw new Error('Failed to fetch files')
      const data = await response.json()
      setFiles(data)
    } catch (error) {
      console.error('Error fetching files:', error)
      toast({
        title: "Error",
        description: "Failed to fetch files. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      toast({
        title: "Success",
        description: "File uploaded successfully.",
      })
      fetchFiles()
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (filename: string) => {
    try {
      const response = await fetch(`${BASE_URL}/delete/${filename}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Delete failed')

      toast({
        title: "Success",
        description: "File deleted successfully.",
      })
      fetchFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingFile) return
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${BASE_URL}/edit/${editingFile}`, {
        method: 'PUT',
        body: formData,
      })

      if (!response.ok) throw new Error('Edit failed')

      toast({
        title: "Success",
        description: "File edited successfully.",
      })
      setEditingFile(null)
      fetchFiles()
    } catch (error) {
      console.error('Error editing file:', error)
      toast({
        title: "Error",
        description: "Failed to edit file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB'
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB'
    else return (bytes / 1073741824).toFixed(2) + ' GB'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const isImageFile = (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
    const extension = filename.split('.').pop()?.toLowerCase()
    return extension ? imageExtensions.includes(extension) : false
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">File Manager</h1>
      <div className="mb-4">
        <Input type="file" onChange={handleUpload} />
      </div>
      {isLoading ? (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preview</TableHead>
              <TableHead>Filename</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file._id}>
                <TableCell>
                  {isImageFile(file.filename) ? (
                    <img
                      src={`${BASE_URL}/file/${file.filename}`}
                      alt={file.filename}
                      className="w-16 h-16 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 flex items-center justify-center">
                      No preview
                    </div>
                  )}
                </TableCell>
                <TableCell>{file.filename}</TableCell>
                <TableCell>{formatFileSize(file.length)}</TableCell>
                <TableCell>{formatDate(file.uploadDate)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => setEditingFile(file.filename)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit File</DialogTitle>
                        </DialogHeader>
                        <Input type="file" onChange={handleEdit} />
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(file.filename)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}